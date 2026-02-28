import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const CONTENT_DIR = join(__dirname, "../../content");
const FLASHCARDS_DIR = join(CONTENT_DIR, "flashcards");
const BLUEPRINT_PATH = join(CONTENT_DIR, "exam-blueprint.json");

interface Flashcard {
  id: string;
  objectiveCode: string;
  question: string;
  answer: string;
  explanation: string;
  sourceUrl: string;
  difficulty: string;
  tags: string[];
}

interface FlashcardFile {
  domain: number;
  domainName: string;
  flashcards: Flashcard[];
}

interface ExamBlueprint {
  domains: {
    number: number;
    objectives: { code: string; title: string }[];
  }[];
}

// Load all flashcard files
function loadAllFlashcards(): { file: string; data: FlashcardFile }[] {
  const files = readdirSync(FLASHCARDS_DIR).filter((f) =>
    f.endsWith(".json")
  );
  return files.map((file) => ({
    file,
    data: JSON.parse(
      readFileSync(join(FLASHCARDS_DIR, file), "utf-8")
    ) as FlashcardFile,
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

describe("Flashcard Content Validation", () => {
  const flashcardFiles = loadAllFlashcards();
  const allFlashcards = flashcardFiles.flatMap((f) => f.data.flashcards);
  const blueprint = loadBlueprint();
  const validCodes = getValidObjectiveCodes(blueprint);

  const requiredFields: (keyof Flashcard)[] = [
    "id",
    "objectiveCode",
    "question",
    "answer",
    "explanation",
    "sourceUrl",
    "difficulty",
    "tags",
  ];

  it("every flashcard has all required fields", () => {
    const violations: string[] = [];

    for (const card of allFlashcards) {
      for (const field of requiredFields) {
        if (
          card[field] === undefined ||
          card[field] === null ||
          card[field] === ""
        ) {
          violations.push(
            `Flashcard ${card.id || "UNKNOWN"}: missing field "${field}"`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("has no duplicate IDs across all flashcard files", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const { file, data } of flashcardFiles) {
      for (const card of data.flashcards) {
        if (seen.has(card.id)) {
          duplicates.push(
            `Duplicate ID "${card.id}" found in ${file} and ${seen.get(card.id)}`
          );
        } else {
          seen.set(card.id, file);
        }
      }
    }

    expect(duplicates).toEqual([]);
  });

  it("all objectiveCodes match the exam blueprint", () => {
    const invalid: string[] = [];

    for (const card of allFlashcards) {
      if (!validCodes.has(card.objectiveCode)) {
        invalid.push(
          `Flashcard ${card.id}: objectiveCode "${card.objectiveCode}" not in blueprint`
        );
      }
    }

    expect(invalid).toEqual([]);
  });

  it("difficulty is one of: easy, medium, hard", () => {
    const validDifficulties = new Set(["easy", "medium", "hard"]);
    const invalid: string[] = [];

    for (const card of allFlashcards) {
      if (!validDifficulties.has(card.difficulty)) {
        invalid.push(
          `Flashcard ${card.id}: invalid difficulty "${card.difficulty}"`
        );
      }
    }

    expect(invalid).toEqual([]);
  });

  it("all domains have at least 10 flashcards", () => {
    const domainCounts = new Map<number, number>();

    for (const { data } of flashcardFiles) {
      const current = domainCounts.get(data.domain) || 0;
      domainCounts.set(data.domain, current + data.flashcards.length);
    }

    const underRepresented: string[] = [];
    for (const domain of blueprint.domains) {
      const count = domainCounts.get(domain.number) || 0;
      if (count < 10) {
        underRepresented.push(
          `Domain ${domain.number} has only ${count} flashcards (minimum: 10)`
        );
      }
    }

    expect(underRepresented).toEqual([]);
  });

  it("sourceUrls are valid URL format", () => {
    const invalid: string[] = [];
    const urlPattern = /^https?:\/\/.+/;

    for (const card of allFlashcards) {
      if (!urlPattern.test(card.sourceUrl)) {
        invalid.push(
          `Flashcard ${card.id}: invalid sourceUrl "${card.sourceUrl}"`
        );
      }
    }

    expect(invalid).toEqual([]);
  });

  it("tags is a non-empty array of strings", () => {
    const invalid: string[] = [];

    for (const card of allFlashcards) {
      if (!Array.isArray(card.tags) || card.tags.length === 0) {
        invalid.push(`Flashcard ${card.id}: tags must be a non-empty array`);
      } else if (card.tags.some((t) => typeof t !== "string" || t === "")) {
        invalid.push(
          `Flashcard ${card.id}: all tags must be non-empty strings`
        );
      }
    }

    expect(invalid).toEqual([]);
  });
});
