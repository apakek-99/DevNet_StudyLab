import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const difficultyEnum = pgEnum("difficulty", [
  "easy",
  "medium",
  "hard",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "multiple_select",
  "drag_drop",
  "fill_blank",
]);

export const labTypeEnum = pgEnum("lab_type", [
  "python",
  "bash",
  "api",
  "git",
  "docker",
  "ansible",
  "netconf",
]);

export const labStatusEnum = pgEnum("lab_status", [
  "started",
  "completed",
  "failed",
]);

export const tutorRoleEnum = pgEnum("tutor_role", [
  "user",
  "assistant",
  "system",
]);

// ---------------------------------------------------------------------------
// Auth tables (Auth.js / NextAuth adapter compatible)
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    hashedPassword: text("hashed_password"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    uniqueIndex("accounts_provider_account_idx").on(
      table.provider,
      table.providerAccountId,
    ),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionToken: text("session_token").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ],
);

// ---------------------------------------------------------------------------
// Domain & Objective tables
// ---------------------------------------------------------------------------

export const domains = pgTable(
  "domains",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    weight: integer("weight").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [uniqueIndex("domains_slug_idx").on(table.slug)],
);

export const objectives = pgTable(
  "objectives",
  {
    id: serial("id").primaryKey(),
    domainId: integer("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
  },
  (table) => [index("objectives_domain_id_idx").on(table.domainId)],
);

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectiveId: integer("objective_id")
      .notNull()
      .references(() => objectives.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    explanation: text("explanation"),
    sourceUrl: text("source_url"),
    difficulty: difficultyEnum("difficulty").notNull().default("medium"),
    tags: text("tags").array(),
  },
  (table) => [index("flashcards_objective_id_idx").on(table.objectiveId)],
);

export const flashcardProgress = pgTable(
  "flashcard_progress",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    flashcardId: uuid("flashcard_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    ease: real("ease").notNull().default(2.5),
    interval: integer("interval").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    nextReview: timestamp("next_review", { mode: "date" }),
    lastReview: timestamp("last_review", { mode: "date" }),
  },
  (table) => [
    index("flashcard_progress_user_id_idx").on(table.userId),
    index("flashcard_progress_next_review_idx").on(table.nextReview),
    uniqueIndex("flashcard_progress_user_card_idx").on(
      table.userId,
      table.flashcardId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Practice Questions & Attempts
// ---------------------------------------------------------------------------

export const practiceQuestions = pgTable(
  "practice_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectiveId: integer("objective_id")
      .notNull()
      .references(() => objectives.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull(),
    question: text("question").notNull(),
    options: jsonb("options"),
    correctAnswer: jsonb("correct_answer").notNull(),
    explanation: text("explanation"),
    sourceUrl: text("source_url"),
    difficulty: difficultyEnum("difficulty").notNull().default("medium"),
    tags: text("tags").array(),
  },
  (table) => [
    index("practice_questions_objective_id_idx").on(table.objectiveId),
  ],
);

export const practiceAttempts = pgTable(
  "practice_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }),
    score: real("score"),
    totalQuestions: integer("total_questions"),
    domainFilter: text("domain_filter"),
  },
  (table) => [index("practice_attempts_user_id_idx").on(table.userId)],
);

export const practiceAnswers = pgTable(
  "practice_answers",
  {
    id: serial("id").primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => practiceAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => practiceQuestions.id, { onDelete: "cascade" }),
    userAnswer: jsonb("user_answer"),
    isCorrect: boolean("is_correct").notNull(),
    timeSpent: integer("time_spent"),
  },
  (table) => [index("practice_answers_attempt_id_idx").on(table.attemptId)],
);

// ---------------------------------------------------------------------------
// Labs
// ---------------------------------------------------------------------------

export const labs = pgTable(
  "labs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectiveId: integer("objective_id")
      .notNull()
      .references(() => objectives.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    difficulty: difficultyEnum("difficulty").notNull().default("medium"),
    estimatedMinutes: integer("estimated_minutes"),
    type: labTypeEnum("type").notNull(),
    instructions: text("instructions"),
    starterCode: text("starter_code"),
    solutionCode: text("solution_code"),
    validationScript: text("validation_script"),
    tags: text("tags").array(),
  },
  (table) => [
    uniqueIndex("labs_slug_idx").on(table.slug),
    index("labs_objective_id_idx").on(table.objectiveId),
  ],
);

export const labAttempts = pgTable(
  "lab_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    labId: uuid("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "cascade" }),
    status: labStatusEnum("status").notNull().default("started"),
    startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }),
    userCode: text("user_code"),
    grade: real("grade"),
    feedback: text("feedback"),
  },
  (table) => [index("lab_attempts_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// Study Progress
// ---------------------------------------------------------------------------

export const studyProgress = pgTable(
  "study_progress",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domainId: integer("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    objectiveId: integer("objective_id").references(() => objectives.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    confidenceLevel: integer("confidence_level").notNull().default(1),
    notes: text("notes"),
  },
  (table) => [
    index("study_progress_user_id_idx").on(table.userId),
    index("study_progress_domain_id_idx").on(table.domainId),
    index("study_progress_objective_id_idx").on(table.objectiveId),
  ],
);

// ---------------------------------------------------------------------------
// AI Tutor Conversations
// ---------------------------------------------------------------------------

export const tutorConversations = pgTable(
  "tutor_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    domainId: integer("domain_id").references(() => domains.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("tutor_conversations_user_id_idx").on(table.userId)],
);

export const tutorMessages = pgTable(
  "tutor_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => tutorConversations.id, { onDelete: "cascade" }),
    role: tutorRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("tutor_messages_conversation_id_idx").on(table.conversationId),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  flashcardProgress: many(flashcardProgress),
  practiceAttempts: many(practiceAttempts),
  labAttempts: many(labAttempts),
  studyProgress: many(studyProgress),
  tutorConversations: many(tutorConversations),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const domainsRelations = relations(domains, ({ many }) => ({
  objectives: many(objectives),
  studyProgress: many(studyProgress),
  tutorConversations: many(tutorConversations),
}));

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  domain: one(domains, {
    fields: [objectives.domainId],
    references: [domains.id],
  }),
  flashcards: many(flashcards),
  practiceQuestions: many(practiceQuestions),
  labs: many(labs),
  studyProgress: many(studyProgress),
}));

export const flashcardsRelations = relations(flashcards, ({ one, many }) => ({
  objective: one(objectives, {
    fields: [flashcards.objectiveId],
    references: [objectives.id],
  }),
  progress: many(flashcardProgress),
}));

export const flashcardProgressRelations = relations(
  flashcardProgress,
  ({ one }) => ({
    user: one(users, {
      fields: [flashcardProgress.userId],
      references: [users.id],
    }),
    flashcard: one(flashcards, {
      fields: [flashcardProgress.flashcardId],
      references: [flashcards.id],
    }),
  }),
);

export const practiceQuestionsRelations = relations(
  practiceQuestions,
  ({ one, many }) => ({
    objective: one(objectives, {
      fields: [practiceQuestions.objectiveId],
      references: [objectives.id],
    }),
    answers: many(practiceAnswers),
  }),
);

export const practiceAttemptsRelations = relations(
  practiceAttempts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [practiceAttempts.userId],
      references: [users.id],
    }),
    answers: many(practiceAnswers),
  }),
);

export const practiceAnswersRelations = relations(
  practiceAnswers,
  ({ one }) => ({
    attempt: one(practiceAttempts, {
      fields: [practiceAnswers.attemptId],
      references: [practiceAttempts.id],
    }),
    question: one(practiceQuestions, {
      fields: [practiceAnswers.questionId],
      references: [practiceQuestions.id],
    }),
  }),
);

export const labsRelations = relations(labs, ({ one, many }) => ({
  objective: one(objectives, {
    fields: [labs.objectiveId],
    references: [objectives.id],
  }),
  attempts: many(labAttempts),
}));

export const labAttemptsRelations = relations(labAttempts, ({ one }) => ({
  user: one(users, {
    fields: [labAttempts.userId],
    references: [users.id],
  }),
  lab: one(labs, {
    fields: [labAttempts.labId],
    references: [labs.id],
  }),
}));

export const studyProgressRelations = relations(studyProgress, ({ one }) => ({
  user: one(users, {
    fields: [studyProgress.userId],
    references: [users.id],
  }),
  domain: one(domains, {
    fields: [studyProgress.domainId],
    references: [domains.id],
  }),
  objective: one(objectives, {
    fields: [studyProgress.objectiveId],
    references: [objectives.id],
  }),
}));

export const tutorConversationsRelations = relations(
  tutorConversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [tutorConversations.userId],
      references: [users.id],
    }),
    domain: one(domains, {
      fields: [tutorConversations.domainId],
      references: [domains.id],
    }),
    messages: many(tutorMessages),
  }),
);

export const tutorMessagesRelations = relations(tutorMessages, ({ one }) => ({
  conversation: one(tutorConversations, {
    fields: [tutorMessages.conversationId],
    references: [tutorConversations.id],
  }),
}));
