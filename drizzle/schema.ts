import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Question banks table
 * Groups questions into selectable quiz sets.
 */
export const questionBanks = mysqlTable("question_banks", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuestionBank = typeof questionBanks.$inferSelect;
export type InsertQuestionBank = typeof questionBanks.$inferInsert;

/**
 * Quiz questions table
 * Stores all quiz questions with multiple choice answers
 */
export const quizQuestions = mysqlTable("quiz_questions", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  bankId: int("bankId"),
  questionText: text("questionText").notNull(),
  answerA: text("answerA").notNull(),
  answerB: text("answerB").notNull(),
  answerC: text("answerC").notNull(),
  answerD: text("answerD").notNull(),
  correctAnswer: mysqlEnum("correctAnswer", ["A", "B", "C", "D"]).notNull(),
  points: int("points").notNull().default(10),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = typeof quizQuestions.$inferInsert;

/**
 * Quiz sessions table
 * Represents a single quiz event with two competing groups
 */
export const quizSessions = mysqlTable("quiz_sessions", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  groupOneName: varchar("groupOneName", { length: 255 }).notNull(),
  groupTwoName: varchar("groupTwoName", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["setup", "in_progress", "completed"]).default("setup").notNull(),
  currentQuestionIndex: int("currentQuestionIndex").default(-1).notNull(),
  timerStarted: boolean("timerStarted").default(false).notNull(),
  answerRevealed: boolean("answerRevealed").default(false).notNull(),
  questionPassed: boolean("questionPassed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuizSession = typeof quizSessions.$inferSelect;
export type InsertQuizSession = typeof quizSessions.$inferInsert;

/**
 * Quiz session questions table
 * Links questions to a specific quiz session and tracks their order
 */
export const quizSessionQuestions = mysqlTable("quiz_session_questions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  questionId: int("questionId").notNull(),
  questionOrder: int("questionOrder").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizSessionQuestion = typeof quizSessionQuestions.$inferSelect;
export type InsertQuizSessionQuestion = typeof quizSessionQuestions.$inferInsert;

/**
 * Scores table
 * Tracks cumulative points for each group in a quiz session
 */
export const scores = mysqlTable("scores", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  groupNumber: mysqlEnum("groupNumber", ["1", "2"]).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Score = typeof scores.$inferSelect;
export type InsertScore = typeof scores.$inferInsert;

/**
 * Question responses table
 * Tracks which group answered each question correctly
 */
export const questionResponses = mysqlTable("question_responses", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  questionId: int("questionId").notNull(),
  groupNumber: mysqlEnum("groupNumber", ["1", "2"]).notNull(),
  pointsAwarded: int("pointsAwarded").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuestionResponse = typeof questionResponses.$inferSelect;
export type InsertQuestionResponse = typeof questionResponses.$inferInsert;

/**
 * App settings table
 * Stores configurable quiz behavior values.
 */
export const appSettings = mysqlTable("app_settings", {
  settingKey: varchar("settingKey", { length: 100 }).primaryKey(),
  settingValue: varchar("settingValue", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;
