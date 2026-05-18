import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, quizQuestions, InsertQuizQuestion, quizSessions, InsertQuizSession, quizSessionQuestions, InsertQuizSessionQuestion, scores, InsertScore, questionResponses, InsertQuestionResponse } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Quiz-related queries
export async function createQuestion(data: InsertQuizQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(quizQuestions).values(data);
  return result;
}

export async function getQuestions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(quizQuestions);
  return result;
}

export async function getQuestionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateQuestion(id: number, data: Partial<InsertQuizQuestion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(quizQuestions).set(data).where(eq(quizQuestions.id, id));
}

export async function deleteQuestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
}

export async function createQuizSession(data: InsertQuizSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(quizSessions).values(data);
  return result;
}

export async function getQuizSession(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(quizSessions).where(eq(quizSessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateQuizSession(id: number, data: Partial<InsertQuizSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(quizSessions).set(data).where(eq(quizSessions.id, id));
}

export async function addQuestionToSession(data: InsertQuizSessionQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(quizSessionQuestions).values(data);
}

export async function getSessionQuestions(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(quizSessionQuestions).where(eq(quizSessionQuestions.sessionId, sessionId));
  return result;
}

export async function getSessionScores(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(scores).where(eq(scores.sessionId, sessionId));
  return result;
}

export async function initializeSessionScores(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(scores).values([
    { sessionId, groupNumber: "1", totalPoints: 0 },
    { sessionId, groupNumber: "2", totalPoints: 0 },
  ]);
}

export async function updateScore(sessionId: number, groupNumber: "1" | "2", points: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const score = await db.select().from(scores)
    .where(and(eq(scores.sessionId, sessionId), eq(scores.groupNumber, groupNumber)))
    .limit(1);
  
  if (score.length > 0) {
    await db.update(scores)
      .set({ totalPoints: score[0].totalPoints + points })
      .where(and(eq(scores.sessionId, sessionId), eq(scores.groupNumber, groupNumber)));
  }
}

export async function recordQuestionResponse(data: InsertQuestionResponse) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(questionResponses).values(data);
}

// TODO: add more feature queries here as your schema grows.
