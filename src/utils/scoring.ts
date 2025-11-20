import { env } from '../config';

export interface ScoringInput {
  similarity?: number; // 0-1
  recencyMs: number;
  importanceScore: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * Exponential half-life decay:
 * score = e^(-ln(2) * ageHours / halfLifeHours)
 * - Very recent memories (~0 age) => score ~1
 * - After each half-life, score halves.
 */
export const computeRecencyScore = (recencyMs: number, halfLifeHours = 24): number => {
  const hours = recencyMs / (1000 * 60 * 60);
  const decay = Math.exp(-Math.log(2) * (hours / halfLifeHours));
  return clamp(decay);
};

export const computeFinalScore = ({ similarity = 0, recencyMs, importanceScore }: ScoringInput) => {
  const recencyScore = computeRecencyScore(recencyMs);
  const weights = env.scoringWeights;
  const finalScore =
    weights.similarity * clamp(similarity) +
    weights.recency * recencyScore +
    weights.importance * clamp(importanceScore);
  return {
    finalScore,
    recencyScore,
    similarity: clamp(similarity)
  };
};
