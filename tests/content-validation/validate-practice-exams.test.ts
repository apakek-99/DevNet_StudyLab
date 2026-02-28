import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const CONTENT_DIR = join(__dirname, "../../content");
const EXAMS_DIR = join(CONTENT_DIR, "practice-exams");
const BLUEPRINT_PATH = join(CONTENT_DIR, "exam-blueprint.json");

interface ExamQuestion {
  id: string;
  objectiveCode: string;
  type: string;
  question: string;
  options: string[];
  correctAnswer: string | string[];
  explanation: string;
  sourceUrl: string;
  difficulty: string;
  tags: string[];
}

interface ExamFile {
  examId: string;
  title: string;
  description: string;
  totalQuestions: number;
  timeLimit: number;
  questions: ExamQuestion[];
}

interface ExamBlueprint {
  domains: {
    number: number;
    slug: string;
    name: string;
    weight: number;
    objectives: { code: string; title: string }[];
  }[];
}

// Load all exam files
function loadAllExams(): { file: string; data: ExamFile }[] {
  const files = readdirSync(EXAMS_DIR).filter((f) => f.endsWith(".json"));
  return files.map((file) => ({
    file,
    data: JSON.parse(
      readFileSync(join(EXAMS_DIR, file), "utf-8")
    ) as ExamFile,
  }));
}

// Load exam blueprint
function loadBlueprint(): ExamBlueprint {
  return JSON.parse(readFileSync(BLUEPRINT_PATH, "utf-8")) as ExamBlueprint;
}

// Get all valid objective codes from the blueprint
function getValidObjectiveCodes(blueprint: ExamBlueprint): Set<string> {
  const codes = new Set<string>();
  for (const domain of blueprint.domains) {
    for (const obj of domain.objectives) {
      codes.add(obj.code);
    }
  }
  return codes;
}

// Get domain number from objective code (e.g., "2.3" -> 2)
function getDomainFromCode(code: string): number {
  return parseInt(code.split(".")[0], 10);
}

const VALID_QUESTION_TYPES = new Set([
  "multiple_choice",
  "multiple_select",
  "drag_and_drop",
  "fill_in_the_blank",
]);

describe("Practice Exam Content Validation", () => {
  const examFiles = loadAllExams();
  const allQuestions = examFiles.flatMap((f) => f.data.questions);
  const blueprint = loadBlueprint();
  const validCodes = getValidObjectiveCodes(blueprint);

  const requiredFields: (keyof ExamQuestion)[] = [
    "id",
    "objectiveCode",
    "type",
    "question",
    "options",
    "correctAnswer",
    "explanation",
    "sourceUrl",
    "difficulty",
    "tags",
  ];

  it("every question has all required fields", () => {
    const violations: string[] = [];

    for (const q of allQuestions) {
      for (const field of requiredFields) {
        if (q[field] === undefined || q[field] === null || q[field] === "") {
          violations.push(
            `Question ${q.id || "UNKNOWN"}: missing field "${field}"`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("has no duplicate IDs across all exam files", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const { file, data } of examFiles) {
      for (const q of data.questions) {
        if (seen.has(q.id)) {
          duplicates.push(
            `Duplicate ID "${q.id}" found in ${file} and ${seen.get(q.id)}`
          );
        } else {
          seen.set(q.id, file);
        }
      }
    }

    expect(duplicates).toEqual([]);
  });

  it("all objectiveCodes match the exam blueprint", () => {
    const invalid: string[] = [];

    for (const q of allQuestions) {
      if (!validCodes.has(q.objectiveCode)) {
        invalid.push(
          `Question ${q.id}: objectiveCode "${q.objectiveCode}" not in blueprint`
        );
      }
    }

    expect(invalid).toEqual([]);
  });

  it("correctAnswer is valid for the question type", () => {
    const invalid: string[] = [];

    for (const q of allQuestions) {
      if (q.type === "multiple_choice") {
        // Single letter answer (A, B, C, D, etc.)
        if (
          typeof q.correctAnswer !== "string" ||
          !/^[A-Z]$/.test(q.correctAnswer)
        ) {
          invalid.push(
            `Question ${q.id}: multiple_choice correctAnswer must be a single letter, got "${q.correctAnswer}"`
          );
        }
      } else if (q.type === "multiple_select") {
        // Array of letters
        if (!Array.isArray(q.correctAnswer)) {
          invalid.push(
            `Question ${q.id}: multiple_select correctAnswer must be an array`
          );
        } else if (
          q.correctAnswer.some((a: string) => !/^[A-Z]$/.test(a))
        ) {
          invalid.push(
            `Question ${q.id}: multiple_select correctAnswer entries must be single letters`
          );
        }
      }
    }

    expect(invalid).toEqual([]);
  });

  it("multiple choice questions have exactly 4 options", () => {
    const invalid: string[] = [];

    for (const q of allQuestions) {
      if (q.type === "multiple_choice" && q.options.length !== 4) {
        invalid.push(
          `Question ${q.id}: multiple_choice must have exactly 4 options, got ${q.options.length}`
        );
      }
    }

    expect(invalid).toEqual([]);
  });

  it("multiple select questions have at least 4 options with at least 2 correct", () => {
    const invalid: string[] = [];

    for (const q of allQuestions) {
      if (q.type === "multiple_select") {
        if (q.options.length < 4) {
          invalid.push(
            `Question ${q.id}: multiple_select must have at least 4 options, got ${q.options.length}`
          );
        }
        if (Array.isArray(q.correctAnswer) && q.correctAnswer.length < 2) {
          invalid.push(
            `Question ${q.id}: multiple_select must have at least 2 correct answers, got ${q.correctAnswer.length}`
          );
        }
      }
    }

    expect(invalid).toEqual([]);
  });

  it("all 6 domains are covered", () => {
    const coveredDomains = new Set<number>();

    for (const q of allQuestions) {
      coveredDomains.add(getDomainFromCode(q.objectiveCode));
    }

    const missingDomains: number[] = [];
    for (let i = 1; i <= 6; i++) {
      if (!coveredDomains.has(i)) {
        missingDomains.push(i);
      }
    }

    expect(missingDomains).toEqual([]);
  });

  it("question type is a valid enum", () => {
    const invalid: string[] = [];

    for (const q of allQuestions) {
      if (!VALID_QUESTION_TYPES.has(q.type)) {
        invalid.push(
          `Question ${q.id}: invalid type "${q.type}". Must be one of: ${Array.from(VALID_QUESTION_TYPES).join(", ")}`
        );
      }
    }

    expect(invalid).toEqual([]);
  });

  it("difficulty is one of: easy, medium, hard", () => {
    const validDifficulties = new Set(["easy", "medium", "hard"]);
    const invalid: string[] = [];

    for (const q of allQuestions) {
      if (!validDifficulties.has(q.difficulty)) {
        invalid.push(
          `Question ${q.id}: invalid difficulty "${q.difficulty}"`
        );
      }
    }

    expect(invalid).toEqual([]);
  });

  it("sourceUrls are valid URL format", () => {
    const invalid: string[] = [];
    const urlPattern = /^https?:\/\/.+/;

    for (const q of allQuestions) {
      if (!urlPattern.test(q.sourceUrl)) {
        invalid.push(
          `Question ${q.id}: invalid sourceUrl "${q.sourceUrl}"`
        );
      }
    }

    expect(invalid).toEqual([]);
  });
});
