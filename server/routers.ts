import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

const PASSED_QUESTION_POINTS_KEY = "passedQuestionPoints";
const DEFAULT_PASSED_QUESTION_POINTS = 5;
const QUESTION_TYPES = ["multiple_choice", "single_answer"] as const;
const ANSWER_OPTIONS = ["A", "B", "C", "D"] as const;
const pointsSchema = z.coerce
  .number()
  .int("Points must be a whole number")
  .min(1, "Points must be at least 1");

const questionInputSchema = z
  .object({
    questionType: z.enum(QUESTION_TYPES).default("multiple_choice"),
    questionText: z.string().min(1, "Question text is required"),
    bankId: z.number().optional(),
    answerA: z.string().min(1, "Answer is required"),
    answerB: z.string().optional().default(""),
    answerC: z.string().optional().default(""),
    answerD: z.string().optional().default(""),
    correctAnswer: z.enum(ANSWER_OPTIONS).optional().default("A"),
    points: pointsSchema,
  })
  .superRefine((question, ctx) => {
    if (question.questionType !== "multiple_choice") return;

    (["answerB", "answerC", "answerD"] as const).forEach((field) => {
      if (!question[field].trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field.replace("answer", "Answer ")} is required`,
        });
      }
    });
  });

const questionUpdateSchema = z.object({
  id: z.number(),
  questionType: z.enum(QUESTION_TYPES).optional(),
  questionText: z.string().optional(),
  answerA: z.string().optional(),
  answerB: z.string().optional(),
  answerC: z.string().optional(),
  answerD: z.string().optional(),
  correctAnswer: z.enum(ANSWER_OPTIONS).optional(),
  points: pointsSchema.optional(),
});

function normalizeQuestionInput(question: z.infer<typeof questionInputSchema>) {
  if (question.questionType === "single_answer") {
    return {
      ...question,
      answerB: "",
      answerC: "",
      answerD: "",
      correctAnswer: "A" as const,
    };
  }

  const { questionType, ...multipleChoiceQuestion } = question;
  return multipleChoiceQuestion;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Quiz Questions Management
  questionBanks: router({
    list: protectedProcedure.query(async () => {
      return await db.getQuestionBanks();
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1, "Bank name is required"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await db.createQuestionBank({
          name: input.name,
          createdBy: ctx.user.id,
        });

        return { success: true, bankId: result[0].insertId };
      }),
  }),

  questions: router({
    list: protectedProcedure
      .input(z.object({ bankId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getQuestions(input?.bankId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const question = await db.getQuestionById(input.id);
        if (!question) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Question not found",
          });
        }
        return question;
      }),

    create: protectedProcedure
      .input(questionInputSchema)
      .mutation(async ({ input, ctx }) => {
        return await db.createQuestion({
          ...normalizeQuestionInput(input),
          createdBy: ctx.user.id,
        });
      }),

    bulkCreate: protectedProcedure
      .input(
        z.object({
          questions: z
            .array(questionInputSchema)
            .min(1, "At least one question is required"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        for (const question of input.questions) {
          await db.createQuestion({
            ...normalizeQuestionInput(question),
            createdBy: ctx.user.id,
          });
        }

        return { success: true, count: input.questions.length };
      }),

    update: protectedProcedure
      .input(questionUpdateSchema)
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateQuestion(
          id,
          updateData.questionType === "single_answer"
            ? {
                ...updateData,
                answerB: "",
                answerC: "",
                answerD: "",
                correctAnswer: "A",
              }
            : updateData
        );
        return await db.getQuestionById(id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteQuestion(input.id);
        return { success: true };
      }),
  }),

  settings: router({
    get: protectedProcedure.query(async () => {
      const passedQuestionPoints = await db.getNumberSetting(
        PASSED_QUESTION_POINTS_KEY,
        DEFAULT_PASSED_QUESTION_POINTS
      );

      return { passedQuestionPoints };
    }),

    update: adminProcedure
      .input(
        z.object({
          passedQuestionPoints: z.number().int().min(0),
        })
      )
      .mutation(async ({ input }) => {
        await db.setNumberSetting(
          PASSED_QUESTION_POINTS_KEY,
          input.passedQuestionPoints
        );

        return { success: true };
      }),
  }),

  // Quiz Session Management
  session: router({
    create: protectedProcedure
      .input(
        z.object({
          groupOneName: z.string().min(1, "Group 1 name is required"),
          groupTwoName: z.string().min(1, "Group 2 name is required"),
          questionIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Create session
        const sessionResult = await db.createQuizSession({
          createdBy: ctx.user.id,
          groupOneName: input.groupOneName,
          groupTwoName: input.groupTwoName,
          status: "setup",
          currentQuestionIndex: -1,
          timerStarted: false,
          answerRevealed: false,
          questionPassed: false,
        });

        const sessionId = sessionResult[0].insertId;

        // Add questions to session
        for (let i = 0; i < input.questionIds.length; i++) {
          await db.addQuestionToSession({
            sessionId,
            questionId: input.questionIds[i],
            questionOrder: i,
          });
        }

        // Initialize scores
        await db.initializeSessionScores(sessionId);

        return { sessionId };
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const session = await db.getQuizSession(input.id);
        if (!session) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }
        return session;
      }),

    start: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateQuizSession(input.id, {
          status: "in_progress",
          currentQuestionIndex: 0,
          timerStarted: false,
          answerRevealed: false,
          questionPassed: false,
        });
        return { success: true };
      }),

    startTimer: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateQuizSession(input.id, {
          timerStarted: true,
          questionPassed: false,
        });
        return { success: true };
      }),

    revealAnswer: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateQuizSession(input.id, {
          answerRevealed: true,
          questionPassed: false,
        });
        return { success: true };
      }),

    passQuestion: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateQuizSession(input.id, {
          timerStarted: false,
          answerRevealed: false,
          questionPassed: true,
        });
        return { success: true };
      }),

    nextQuestion: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const session = await db.getQuizSession(input.id);
        if (!session) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }

        const questions = await db.getSessionQuestions(input.id);
        const nextIndex = session.currentQuestionIndex + 1;

        if (nextIndex >= questions.length) {
          await db.updateQuizSession(input.id, {
            status: "completed",
            timerStarted: false,
            answerRevealed: false,
            questionPassed: false,
          });
          return { success: true, completed: true };
        }

        await db.updateQuizSession(input.id, {
          currentQuestionIndex: nextIndex,
          timerStarted: false,
          answerRevealed: false,
          questionPassed: false,
        });
        return { success: true, completed: false };
      }),

    end: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateQuizSession(input.id, {
          status: "completed",
        });
        return { success: true };
      }),

    getQuestions: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        const sessionQuestions = await db.getSessionQuestions(input.sessionId);
        const questions = await Promise.all(
          sessionQuestions.map(sq => db.getQuestionById(sq.questionId))
        );
        return questions.map((q, idx) => ({
          ...q,
          order: sessionQuestions[idx].questionOrder,
        }));
      }),

    getScores: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSessionScores(input.sessionId);
      }),
  }),

  // Scoring Management
  scoring: router({
    awardPoints: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          groupNumber: z.enum(["1", "2"]),
          points: z.number().int().min(0),
          questionId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        // Award points to group
        await db.updateScore(input.sessionId, input.groupNumber, input.points);

        // Record response
        await db.recordQuestionResponse({
          sessionId: input.sessionId,
          questionId: input.questionId,
          groupNumber: input.groupNumber,
          pointsAwarded: input.points,
        });

        return { success: true };
      }),

    adjustPoints: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          groupNumber: z.enum(["1", "2"]),
          points: z.number().int(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateScore(input.sessionId, input.groupNumber, input.points);

        return { success: true };
      }),

    getScores: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSessionScores(input.sessionId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
