"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types (client-safe — no fs imports)
// ---------------------------------------------------------------------------

export interface Flashcard {
  id: string;
  domain: number;
  domainName: string;
  domainSlug: string;
  objectiveCode: string;
  question: string;
  answer: string;
  explanation: string;
  sourceUrl: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
}

export interface FlashcardProgress {
  flashcardId: string;
  repetitions: number;
  ease: number;
  interval: number;
  nextReview: string;
  lastReview: string;
  quality: number;
}

export interface FlashcardStats {
  total: number;
  dueToday: number;
  mastered: number;   // interval > 21 days
  learning: number;   // reviewed but interval <= 21
  newCards: number;    // never reviewed
}

export interface ReviewSessionStats {
  cardsReviewed: number;
  correctCount: number;
  incorrectCount: number;
  averageQuality: number;
  nextReviewTime: string | null;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "devnet-flashcard-progress";

function loadAllProgress(): Record<string, FlashcardProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllProgress(progress: Record<string, FlashcardProgress>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// ---------------------------------------------------------------------------
// SM-2 (client-side copy so the hook is self-contained)
// ---------------------------------------------------------------------------

function sm2Client(
  quality: number,
  repetitions: number,
  ease: number,
  interval: number
) {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let newReps = repetitions;
  let newEase = ease;
  let newInterval = interval;

  if (q >= 3) {
    if (newReps === 0) newInterval = 1;
    else if (newReps === 1) newInterval = 6;
    else newInterval = Math.round(interval * ease);
    newReps += 1;
  } else {
    newReps = 0;
    newInterval = 1;
  }

  newEase = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEase < 1.3) newEase = 1.3;
  newEase = Math.round(newEase * 100) / 100;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    repetitions: newReps,
    ease: newEase,
    interval: newInterval,
    nextReview: nextReview.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFlashcards() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [progress, setProgress] = useState<Record<string, FlashcardProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review session state
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState<ReviewSessionStats>({
    cardsReviewed: 0,
    correctCount: 0,
    incorrectCount: 0,
    averageQuality: 0,
    nextReviewTime: null,
  });

  // ---- Load flashcards from API ----
  useEffect(() => {
    async function fetchCards() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/flashcards");
        if (!res.ok) throw new Error("Failed to fetch flashcards");
        const data = await res.json();
        setFlashcards(data.flashcards ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCards();
  }, []);

  // ---- Load progress from localStorage, then merge with API (DB wins) ----
  useEffect(() => {
    const local = loadAllProgress();
    setProgress(local);

    // Attempt to load from API (returns DB progress if authenticated)
    fetch("/api/flashcards/progress")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.progress && Object.keys(data.progress).length > 0) {
          // Merge: API (DB) values take precedence over localStorage
          const merged = { ...local };
          for (const [id, dbRecord] of Object.entries(data.progress)) {
            const rec = dbRecord as {
              flashcardId: string;
              ease: number;
              interval: number;
              repetitions: number;
              nextReview: string;
              lastReview: string;
            };
            merged[id] = {
              flashcardId: rec.flashcardId,
              ease: rec.ease,
              interval: rec.interval,
              repetitions: rec.repetitions,
              nextReview: rec.nextReview,
              lastReview: rec.lastReview,
              quality: (local[id]?.quality ?? 0),
            };
          }
          setProgress(merged);
          saveAllProgress(merged);
        }
      })
      .catch(() => {
        // API unavailable — localStorage is the sole source
      });
  }, []);

  // ---- Derived: cards due for review ----
  const dueCards = useMemo(() => {
    const now = new Date();
    return flashcards.filter((card) => {
      const p = progress[card.id];
      if (!p) return true; // never reviewed
      return new Date(p.nextReview) <= now;
    });
  }, [flashcards, progress]);

  // ---- Stats ----
  const stats: FlashcardStats = useMemo(() => {
    let mastered = 0;
    let learning = 0;
    let newCards = 0;

    for (const card of flashcards) {
      const p = progress[card.id];
      if (!p) {
        newCards++;
      } else if (p.interval > 21) {
        mastered++;
      } else {
        learning++;
      }
    }

    return {
      total: flashcards.length,
      dueToday: dueCards.length,
      mastered,
      learning,
      newCards,
    };
  }, [flashcards, progress, dueCards]);

  // ---- Current review card ----
  const reviewCard: Flashcard | null = useMemo(() => {
    if (reviewQueue.length === 0) return null;
    return reviewQueue[reviewIndex] ?? null;
  }, [reviewQueue, reviewIndex]);

  // ---- Start a review session ----
  const startReview = useCallback(
    (domain?: string) => {
      const now = new Date();
      let eligible = flashcards.filter((card) => {
        const p = progress[card.id];
        if (!p) return true;
        return new Date(p.nextReview) <= now;
      });
      if (domain && domain !== "all") {
        eligible = eligible.filter((c) => c.domainSlug === domain);
      }
      // Shuffle for variety
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      setReviewQueue(shuffled);
      setReviewIndex(0);
      setSessionStats({
        cardsReviewed: 0,
        correctCount: 0,
        incorrectCount: 0,
        averageQuality: 0,
        nextReviewTime: null,
      });
    },
    [flashcards, progress]
  );

  // ---- Rate the current card ----
  const rateCard = useCallback(
    (id: string, quality: number) => {
      const p = progress[id];
      const reps = p?.repetitions ?? 0;
      const ease = p?.ease ?? 2.5;
      const interval = p?.interval ?? 0;

      const result = sm2Client(quality, reps, ease, interval);

      const updatedProgress: FlashcardProgress = {
        flashcardId: id,
        repetitions: result.repetitions,
        ease: result.ease,
        interval: result.interval,
        nextReview: result.nextReview,
        lastReview: new Date().toISOString(),
        quality,
      };

      const newProgress = { ...progress, [id]: updatedProgress };

      // Enqueue ALL state updates first (these always succeed)
      setProgress(newProgress);
      setSessionStats((prev) => {
        const reviewed = prev.cardsReviewed + 1;
        const correct = quality >= 3 ? prev.correctCount + 1 : prev.correctCount;
        const incorrect = quality < 3 ? prev.incorrectCount + 1 : prev.incorrectCount;
        const totalQ = prev.averageQuality * prev.cardsReviewed + quality;

        // Find earliest next review among all rated cards this session
        let earliest = prev.nextReviewTime;
        if (!earliest || result.nextReview < earliest) {
          earliest = result.nextReview;
        }

        return {
          cardsReviewed: reviewed,
          correctCount: correct,
          incorrectCount: incorrect,
          averageQuality: reviewed > 0 ? totalQ / reviewed : 0,
          nextReviewTime: earliest,
        };
      });
      setReviewIndex((prev) => prev + 1);

      // Side effects (may fail — must not block advancement)
      try {
        saveAllProgress(newProgress);
      } catch {
        // localStorage may be full or blocked — progress still lives in state
      }

      // Fire-and-forget: sync to DB via API
      fetch("/api/flashcards/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashcardId: id,
          quality,
          currentProgress: p ?? null,
        }),
      }).catch(() => {
        // API unavailable — localStorage is the sole source
      });
    },
    [progress]
  );

  // ---- Navigate review ----
  const nextCard = useCallback(() => {
    setReviewIndex((prev) => Math.min(prev + 1, reviewQueue.length));
  }, [reviewQueue.length]);

  const prevCard = useCallback(() => {
    setReviewIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // ---- End review session ----
  const endReview = useCallback(() => {
    setReviewQueue([]);
    setReviewIndex(0);
  }, []);

  // ---- Get progress for a specific card ----
  const getCardProgress = useCallback(
    (cardId: string): FlashcardProgress | null => {
      return progress[cardId] ?? null;
    },
    [progress]
  );

  // ---- Review session helpers ----
  const isReviewActive = reviewQueue.length > 0;
  const isReviewComplete = isReviewActive && reviewIndex >= reviewQueue.length;
  const reviewProgress = reviewQueue.length > 0
    ? Math.round((Math.min(reviewIndex, reviewQueue.length) / reviewQueue.length) * 100)
    : 0;

  return {
    // Data
    flashcards,
    dueCards,
    progress,
    stats,
    isLoading,
    error,

    // Review session
    reviewCard,
    reviewQueue,
    reviewIndex,
    sessionStats,
    isReviewActive,
    isReviewComplete,
    reviewProgress,

    // Actions
    startReview,
    rateCard,
    nextCard,
    prevCard,
    endReview,
    getCardProgress,
  };
}
