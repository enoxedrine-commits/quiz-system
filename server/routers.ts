import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

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
  questions: router({
    list: protectedProcedure.query(async () => {
      return await db.getQuestions();
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
      .input(
        z.object({
          questionText: z.string().min(1, "Question text is required"),
          answerA: z.string().min(1, "Answer A is required"),
          answerB: z.string().min(1, "Answer B is required"),
          answerC: z.string().min(1, "Answer C is required"),
          answerD: z.string().min(1, "Answer D is required"),
          correctAnswer: z.enum(["A", "B", "C", "D"]),
          points: z.number().int().min(1, "Points must be at least 1"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.createQuestion({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          questionText: z.string().optional(),
          answerA: z.string().optional(),
          answerB: z.string().optional(),
          answerC: z.string().optional(),
          answerD: z.string().optional(),
          correctAnswer: z.enum(["A", "B", "C", "D"]).optional(),
          points: z.number().int().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateQuestion(id, updateData);
        return await db.getQuestionById(id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteQuestion(input.id);
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
          });
          return { success: true, completed: true };
        }

        await db.updateQuizSession(input.id, {
          currentQuestionIndex: nextIndex,
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
          points: z.number().int().min(1),
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

    getScores: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSessionScores(input.sessionId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
