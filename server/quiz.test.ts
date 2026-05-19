import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  createQuestionBank: vi.fn(),
  getQuestionBanks: vi.fn(),
  getQuestions: vi.fn(),
  getQuestionById: vi.fn(),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  createQuizSession: vi.fn(),
  getQuizSession: vi.fn(),
  updateQuizSession: vi.fn(),
  addQuestionToSession: vi.fn(),
  getSessionQuestions: vi.fn(),
  getSessionScores: vi.fn(),
  initializeSessionScores: vi.fn(),
  updateScore: vi.fn(),
  recordQuestionResponse: vi.fn(),
  getNumberSetting: vi.fn(),
  setNumberSetting: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return ctx;
}

describe("Quiz Questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new question", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockResult = { insertId: 1 };
    vi.mocked(db.createQuestion).mockResolvedValueOnce(mockResult as any);

    const result = await caller.questions.create({
      questionText: "What is 2+2?",
      answerA: "3",
      answerB: "4",
      answerC: "5",
      answerD: "6",
      correctAnswer: "B",
      points: 10,
    });

    expect(db.createQuestion).toHaveBeenCalledWith({
      questionText: "What is 2+2?",
      answerA: "3",
      answerB: "4",
      answerC: "5",
      answerD: "6",
      correctAnswer: "B",
      points: 10,
      createdBy: 1,
    });
  });

  it("creates questions in bulk", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.createQuestion).mockResolvedValue(undefined as any);

    const result = await caller.questions.bulkCreate({
      questions: [
        {
          questionText: "First question?",
          answerA: "A1",
          answerB: "B1",
          answerC: "C1",
          answerD: "D1",
          correctAnswer: "A",
          points: 10,
        },
        {
          questionText: "Second question?",
          answerA: "A2",
          answerB: "B2",
          answerC: "C2",
          answerD: "D2",
          correctAnswer: "C",
          points: 20,
        },
      ],
    });

    expect(db.createQuestion).toHaveBeenCalledTimes(2);
    expect(db.createQuestion).toHaveBeenNthCalledWith(1, {
      questionText: "First question?",
      answerA: "A1",
      answerB: "B1",
      answerC: "C1",
      answerD: "D1",
      correctAnswer: "A",
      points: 10,
      createdBy: 1,
    });
    expect(db.createQuestion).toHaveBeenNthCalledWith(2, {
      questionText: "Second question?",
      answerA: "A2",
      answerB: "B2",
      answerC: "C2",
      answerD: "D2",
      correctAnswer: "C",
      points: 20,
      createdBy: 1,
    });
    expect(result).toEqual({ success: true, count: 2 });
  });

  it("lists all questions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockQuestions = [
      {
        id: 1,
        questionText: "Q1",
        answerA: "A1",
        answerB: "B1",
        answerC: "C1",
        answerD: "D1",
        correctAnswer: "A" as const,
        points: 10,
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    vi.mocked(db.getQuestions).mockResolvedValueOnce(mockQuestions);

    const result = await caller.questions.list();

    expect(db.getQuestions).toHaveBeenCalled();
    expect(result).toEqual(mockQuestions);
  });

  it("gets a single question by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockQuestion = {
      id: 1,
      questionText: "Q1",
      answerA: "A1",
      answerB: "B1",
      answerC: "C1",
      answerD: "D1",
      correctAnswer: "A" as const,
      points: 10,
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.getQuestionById).mockResolvedValueOnce(mockQuestion);

    const result = await caller.questions.get({ id: 1 });

    expect(db.getQuestionById).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockQuestion);
  });

  it("throws error when getting non-existent question", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getQuestionById).mockResolvedValueOnce(null);

    try {
      await caller.questions.get({ id: 999 });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("updates a question", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockQuestion = {
      id: 1,
      questionText: "Updated Q1",
      answerA: "A1",
      answerB: "B1",
      answerC: "C1",
      answerD: "D1",
      correctAnswer: "A" as const,
      points: 20,
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.updateQuestion).mockResolvedValueOnce(undefined);
    vi.mocked(db.getQuestionById).mockResolvedValueOnce(mockQuestion);

    const result = await caller.questions.update({
      id: 1,
      questionText: "Updated Q1",
      points: 20,
    });

    expect(db.updateQuestion).toHaveBeenCalledWith(1, {
      questionText: "Updated Q1",
      points: 20,
    });
    expect(result).toEqual(mockQuestion);
  });

  it("deletes a question", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.deleteQuestion).mockResolvedValueOnce(undefined);

    const result = await caller.questions.delete({ id: 1 });

    expect(db.deleteQuestion).toHaveBeenCalledWith(1);
    expect(result).toEqual({ success: true });
  });
});

describe("Question Banks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a question bank", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.createQuestionBank).mockResolvedValueOnce([
      { insertId: 3 },
    ] as any);

    const result = await caller.questionBanks.create({ name: "Science" });

    expect(db.createQuestionBank).toHaveBeenCalledWith({
      name: "Science",
      createdBy: 1,
    });
    expect(result).toEqual({ success: true, bankId: 3 });
  });

  it("lists question banks", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const mockBanks = [
      {
        id: 1,
        createdBy: 1,
        name: "Science",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(db.getQuestionBanks).mockResolvedValueOnce(mockBanks);

    const result = await caller.questionBanks.list();

    expect(db.getQuestionBanks).toHaveBeenCalled();
    expect(result).toEqual(mockBanks);
  });
});

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets quiz settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getNumberSetting).mockResolvedValueOnce(7);

    const result = await caller.settings.get();

    expect(db.getNumberSetting).toHaveBeenCalledWith("passedQuestionPoints", 5);
    expect(result).toEqual({ passedQuestionPoints: 7 });
  });

  it("updates quiz settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.setNumberSetting).mockResolvedValueOnce(undefined);

    const result = await caller.settings.update({ passedQuestionPoints: 3 });

    expect(db.setNumberSetting).toHaveBeenCalledWith("passedQuestionPoints", 3);
    expect(result).toEqual({ success: true });
  });
});

describe("Quiz Sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new quiz session", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockSessionResult = [{ insertId: 1 }];
    vi.mocked(db.createQuizSession).mockResolvedValueOnce(mockSessionResult as any);
    vi.mocked(db.addQuestionToSession).mockResolvedValueOnce(undefined);
    vi.mocked(db.initializeSessionScores).mockResolvedValueOnce(undefined);

    const result = await caller.session.create({
      groupOneName: "Team A",
      groupTwoName: "Team B",
      questionIds: [1, 2, 3],
    });

    expect(db.createQuizSession).toHaveBeenCalledWith({
      createdBy: 1,
      groupOneName: "Team A",
      groupTwoName: "Team B",
      status: "setup",
      currentQuestionIndex: -1,
      timerStarted: false,
      answerRevealed: false,
      questionPassed: false,
    });
    expect(db.addQuestionToSession).toHaveBeenCalledTimes(3);
    expect(db.initializeSessionScores).toHaveBeenCalledWith(1);
    expect(result).toEqual({ sessionId: 1 });
  });

  it("starts a quiz session", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.updateQuizSession).mockResolvedValueOnce(undefined);

    const result = await caller.session.start({ id: 1 });

    expect(db.updateQuizSession).toHaveBeenCalledWith(1, {
      status: "in_progress",
      currentQuestionIndex: 0,
      timerStarted: false,
      answerRevealed: false,
      questionPassed: false,
    });
    expect(result).toEqual({ success: true });
  });

  it("starts the timer for the current question", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.updateQuizSession).mockResolvedValueOnce(undefined);

    const result = await caller.session.startTimer({ id: 1 });

    expect(db.updateQuizSession).toHaveBeenCalledWith(1, {
      timerStarted: true,
      questionPassed: false,
    });
    expect(result).toEqual({ success: true });
  });

  it("reveals the answer for the current question", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.updateQuizSession).mockResolvedValueOnce(undefined);

    const result = await caller.session.revealAnswer({ id: 1 });

    expect(db.updateQuizSession).toHaveBeenCalledWith(1, {
      answerRevealed: true,
      questionPassed: false,
    });
    expect(result).toEqual({ success: true });
  });

  it("passes the current question without advancing", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.updateQuizSession).mockResolvedValueOnce(undefined);

    const result = await caller.session.passQuestion({ id: 1 });

    expect(db.updateQuizSession).toHaveBeenCalledWith(1, {
      timerStarted: false,
      answerRevealed: false,
      questionPassed: true,
    });
    expect(result).toEqual({ success: true });
  });

  it("advances to next question", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockSession = {
      id: 1,
      createdBy: 1,
      groupOneName: "Team A",
      groupTwoName: "Team B",
      status: "in_progress" as const,
      currentQuestionIndex: 0,
      timerStarted: true,
      answerRevealed: true,
      questionPassed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockQuestions = [
      { id: 1, sessionId: 1, questionId: 1, questionOrder: 0, createdAt: new Date() },
      { id: 2, sessionId: 1, questionId: 2, questionOrder: 1, createdAt: new Date() },
    ];

    vi.mocked(db.getQuizSession).mockResolvedValueOnce(mockSession);
    vi.mocked(db.getSessionQuestions).mockResolvedValueOnce(mockQuestions);
    vi.mocked(db.updateQuizSession).mockResolvedValueOnce(undefined);

    const result = await caller.session.nextQuestion({ id: 1 });

    expect(db.updateQuizSession).toHaveBeenCalledWith(1, {
      currentQuestionIndex: 1,
      timerStarted: false,
      answerRevealed: false,
      questionPassed: false,
    });
    expect(result).toEqual({ success: true, completed: false });
  });

  it("completes quiz when on last question", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockSession = {
      id: 1,
      createdBy: 1,
      groupOneName: "Team A",
      groupTwoName: "Team B",
      status: "in_progress" as const,
      currentQuestionIndex: 1,
      timerStarted: true,
      answerRevealed: true,
      questionPassed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockQuestions = [
      { id: 1, sessionId: 1, questionId: 1, questionOrder: 0, createdAt: new Date() },
      { id: 2, sessionId: 1, questionId: 2, questionOrder: 1, createdAt: new Date() },
    ];

    vi.mocked(db.getQuizSession).mockResolvedValueOnce(mockSession);
    vi.mocked(db.getSessionQuestions).mockResolvedValueOnce(mockQuestions);
    vi.mocked(db.updateQuizSession).mockResolvedValueOnce(undefined);

    const result = await caller.session.nextQuestion({ id: 1 });

    expect(db.updateQuizSession).toHaveBeenCalledWith(1, {
      status: "completed",
      timerStarted: false,
      answerRevealed: false,
      questionPassed: false,
    });
    expect(result).toEqual({ success: true, completed: true });
  });

  it("ends a quiz session", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.updateQuizSession).mockResolvedValueOnce(undefined);

    const result = await caller.session.end({ id: 1 });

    expect(db.updateQuizSession).toHaveBeenCalledWith(1, {
      status: "completed",
    });
    expect(result).toEqual({ success: true });
  });

  it("gets session questions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockQuestions = [
      {
        id: 1,
        questionText: "Q1",
        answerA: "A1",
        answerB: "B1",
        answerC: "C1",
        answerD: "D1",
        correctAnswer: "A" as const,
        points: 10,
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockSessionQuestions = [
      { id: 1, sessionId: 1, questionId: 1, questionOrder: 0, createdAt: new Date() },
    ];

    vi.mocked(db.getSessionQuestions).mockResolvedValueOnce(mockSessionQuestions);
    vi.mocked(db.getQuestionById).mockResolvedValueOnce(mockQuestions[0]);

    const result = await caller.session.getQuestions({ sessionId: 1 });

    expect(db.getSessionQuestions).toHaveBeenCalledWith(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ...mockQuestions[0],
      order: 0,
    });
  });

  it("gets session scores", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockScores = [
      { id: 1, sessionId: 1, groupNumber: "1" as const, totalPoints: 30, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, sessionId: 1, groupNumber: "2" as const, totalPoints: 20, createdAt: new Date(), updatedAt: new Date() },
    ];

    vi.mocked(db.getSessionScores).mockResolvedValueOnce(mockScores);

    const result = await caller.session.getScores({ sessionId: 1 });

    expect(db.getSessionScores).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockScores);
  });
});

describe("Scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awards points to a group", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.updateScore).mockResolvedValueOnce(undefined);
    vi.mocked(db.recordQuestionResponse).mockResolvedValueOnce(undefined);

    const result = await caller.scoring.awardPoints({
      sessionId: 1,
      groupNumber: "1",
      points: 10,
      questionId: 1,
    });

    expect(db.updateScore).toHaveBeenCalledWith(1, "1", 10);
    expect(db.recordQuestionResponse).toHaveBeenCalledWith({
      sessionId: 1,
      questionId: 1,
      groupNumber: "1",
      pointsAwarded: 10,
    });
    expect(result).toEqual({ success: true });
  });

  it("gets scores for a session", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockScores = [
      { id: 1, sessionId: 1, groupNumber: "1" as const, totalPoints: 30, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, sessionId: 1, groupNumber: "2" as const, totalPoints: 20, createdAt: new Date(), updatedAt: new Date() },
    ];

    vi.mocked(db.getSessionScores).mockResolvedValueOnce(mockScores);

    const result = await caller.scoring.getScores({ sessionId: 1 });

    expect(db.getSessionScores).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockScores);
  });
});
