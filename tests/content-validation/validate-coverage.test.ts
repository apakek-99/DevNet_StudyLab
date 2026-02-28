import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const CONTENT_DIR = join(__dirname, "../../content");
const FLASHCARDS_DIR = join(CONTENT_DIR, "flashcards");
const EXAMS_DIR = join(CONTENT_DIR, "practice-exams");
const BLUEPRINT_PATH = join(CONTENT_DIR, "exam-blueprint.json");

interface Flashcard {
  id: string;
  objectiveCode: string;
}

interface FlashcardFile {
  domain: number;
  flashcards: Flashcard[];
}

interface ExamQuestion {
  id: string;
  objectiveCode: string;
}

interface ExamFile {
  questions: ExamQuestion[];
}

interface ExamBlueprint {
  domains: {
    number: number;
    name: string;
    weight: number;
    objectives: { code: string; title: string }[];
  }[];
}

// Load helpers
function loadBlueprint(): ExamBlueprint {
  return JSON.parse(readFileSync(BLUEPRINT_PATH, "utf-8")) as ExamBlueprint;
}

function loadAllFlashcards(): Flashcard[] {
  const files = readdirSync(FLASHCARDS_DIR).filter((f) =>
    f.endsWith(".json")
  );
  return files.flatMap((file) => {
    const data = JSON.parse(
      readFileSync(join(FLASHCARDS_DIR, file), "utf-8")
    ) as FlashcardFile;
    return data.flashcards;
  });
}

function loadAllQuestions(): ExamQuestion[] {
  const files = readdirSync(EXAMS_DIR).filter((f) => f.endsWith(".json"));
  return files.flatMap((file) => {
    const data = JSON.parse(
      readFileSync(join(EXAMS_DIR, file), "utf-8")
    ) as ExamFile;
    return data.questions;
  });
}

function getDomainFromCode(code: string): number {
  return parseInt(code.split(".")[0], 10);
}

describe("Content Coverage Validation", () => {
  const blueprint = loadBlueprint();
  const allFlashcards = loadAllFlashcards();
  const allQuestions = loadAllQuestions();

  // Build a set of all valid objective codes
  const allObjectiveCodes = new Set<string>();
  for (const domain of blueprint.domains) {
    for (const obj of domain.objectives) {
      allObjectiveCodes.add(obj.code);
    }
  }

  // Build maps of objective code -> content count
  const flashcardsByObjective = new Map<string, number>();
  for (const card of allFlashcards) {
    const count = flashcardsByObjective.get(card.objectiveCode) || 0;
    flashcardsByObjective.set(card.objectiveCode, count + 1);
  }

  const questionsByObjective = new Map<string, number>();
  for (const q of allQuestions) {
    const count = questionsByObjective.get(q.objectiveCode) || 0;
    questionsByObjective.set(q.objectiveCode, count + 1);
  }

  it("every exam objective has at least 1 flashcard", () => {
    const uncovered: string[] = [];

    for (const code of allObjectiveCodes) {
      if (!flashcardsByObjective.has(code) || flashcardsByObjective.get(code)! < 1) {
        uncovered.push(`Objective ${code}: no flashcards`);
      }
    }

    expect(uncovered).toEqual([]);
  });

  it("every exam objective has at least 1 practice question", () => {
    const uncovered: string[] = [];

    for (const code of allObjectiveCodes) {
      if (!questionsByObjective.has(code) || questionsByObjective.get(code)! < 1) {
        uncovered.push(`Objective ${code}: no practice questions`);
      }
    }

    expect(uncovered).toEqual([]);
  });

  it("domain question distribution roughly matches exam weights (within 5%)", () => {
    const totalQuestions = allQuestions.length;
    const domainQuestionCounts = new Map<number, number>();

    for (const q of allQuestions) {
      const domain = getDomainFromCode(q.objectiveCode);
      const count = domainQuestionCounts.get(domain) || 0;
      domainQuestionCounts.set(domain, count + 1);
    }

    const violations: string[] = [];
    for (const domain of blueprint.domains) {
      const count = domainQuestionCounts.get(domain.number) || 0;
      const actualPercent = (count / totalQuestions) * 100;
      const expectedPercent = domain.weight;
      const diff = Math.abs(actualPercent - expectedPercent);

      if (diff > 5) {
        violations.push(
          `Domain ${domain.number} (${domain.name}): actual ${actualPercent.toFixed(1)}% vs expected ${expectedPercent}% (diff: ${diff.toFixed(1)}%, max allowed: 5%)`
        );
      }
    }

    expect(violations).toEqual([]);
  });

  it("no orphaned flashcard content (referencing non-existent objectives)", () => {
    const orphaned: string[] = [];

    for (const card of allFlashcards) {
      if (!allObjectiveCodes.has(card.objectiveCode)) {
        orphaned.push(
          `Flashcard ${card.id}: references non-existent objective "${card.objectiveCode}"`
        );
      }
    }

    expect(orphaned).toEqual([]);
  });

  it("no orphaned question content (referencing non-existent objectives)", () => {
    const orphaned: string[] = [];

    for (const q of allQuestions) {
      if (!allObjectiveCodes.has(q.objectiveCode)) {
        orphaned.push(
          `Question ${q.id}: references non-existent objective "${q.objectiveCode}"`
        );
      }
    }

    expect(orphaned).toEqual([]);
  });

  it("total objective count matches expected (61 objectives)", () => {
    expect(allObjectiveCodes.size).toBe(61);
  });
});
