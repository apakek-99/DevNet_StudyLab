/**
 * Data Access Layer — barrel export
 *
 * All data access goes through this module. Each sub-module tries the
 * database first and falls back to file reads when DATABASE_URL is
 * not configured or a query fails.
 */

export { getAllFlashcards, type Flashcard } from "./flashcards";

export {
  listExams,
  getExam,
  gradeExam,
  type ExamSummary,
  type GradeResult,
  type QuestionResult,
  type DomainScore,
} from "./exams";

export {
  listLabs,
  getLab,
  getLabSolution,
  getLabForRun,
  type LabMetadata,
  type LabDetail,
} from "./labs";

export { getStudyGuide, type StudyGuide } from "./study";

export {
  getFlashcardProgress,
  upsertFlashcardProgress,
  getExamAttempts,
  saveExamAttempt,
  getLabAttempts,
  saveLabAttempt,
  getStudyProgress,
  saveStudyObjective,
  type FlashcardProgressRecord,
  type ExamAttemptRecord,
  type LabAttemptRecord,
} from "./progress";

export {
  getTutorConversations,
  getTutorConversation,
  createTutorConversation,
  updateTutorConversation,
  deleteTutorConversation,
  saveTutorMessage,
  type TutorConversationRecord,
  type TutorMessageRecord,
  type TutorConversationWithMessages,
} from "./tutor";
