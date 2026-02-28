/**
 * Data Access Layer — Study Guides
 *
 * Study guides are always loaded from JSON files because they are
 * not represented in the database schema (rich, structured content
 * that doesn't benefit from relational storage).
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Resource {
  title: string;
  url: string;
}

export interface KeyTopic {
  objectiveCode: string;
  title: string;
  summary: string;
  keyPoints: string[];
  examTips: string[];
  resources: Resource[];
}

export interface StudyGuide {
  domain: number;
  slug: string;
  name: string;
  weight: number;
  overview: string;
  keyTopics: KeyTopic[];
  practiceScenarios: string[];
  commonMistakes: string[];
}

// ---------------------------------------------------------------------------
// Slug → filename mapping
// ---------------------------------------------------------------------------

const SLUG_TO_FILE: Record<string, string> = {
  "software-dev": "domain-1-software-dev.json",
  apis: "domain-2-apis.json",
  "cisco-platforms": "domain-3-cisco-platforms.json",
  "deployment-security": "domain-4-deployment-security.json",
  "infrastructure-automation": "domain-5-infrastructure-automation.json",
  "network-fundamentals": "domain-6-network-fundamentals.json",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStudyGuidesDir(): string {
  return path.join(process.cwd(), "..", "..", "content", "study-guides");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the study guide for the given domain slug, or null if not found.
 */
export function getStudyGuide(slug: string): StudyGuide | null {
  const filename = SLUG_TO_FILE[slug];
  if (!filename) return null;

  const dir = getStudyGuidesDir();
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) return null;

  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as StudyGuide;
}
