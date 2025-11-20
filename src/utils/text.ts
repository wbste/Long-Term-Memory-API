import { ImportanceHint } from '../types/memory';
import { env } from '../config';

export const normalizeText = (text: string): string =>
  text.trim().replace(/\s+/g, ' ');

export const compressText = (text: string, max = 220): string => {
  if (text.length <= max) return text;
  return `${text.slice(0, max / 2).trim()} ... ${text.slice(-max / 2).trim()}`;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const hintScore = (hint?: ImportanceHint): number => {
  if (!hint) return 0.5;
  if (hint === 'high') return 0.9;
  if (hint === 'medium') return 0.6;
  return 0.3;
};

export const computeImportanceScore = (text: string, hint?: ImportanceHint): number => {
  const normalized = normalizeText(text);
  const lengthFactor = clamp(normalized.length / Math.min(env.maxTextLength, 800));
  const hasNumbers = /\d{2,}/.test(normalized);
  const hasMoney = /(\$|€|£|¥|kr|sek|usd|eur)\s?\d+/i.test(normalized);
  const hasDate =
    /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|yesterday|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(
      normalized
    );
  const decisionKeywords = /(bought|purchased|decided|planned|scheduled|deadline|deliver|ordered|signed|contract)/i.test(
    normalized
  );
  const productOrPerson =
    /(iphone|samsung|pixel|macbook|tesla|gpt|chatgpt|azure|aws|google|microsoft|apple)/i.test(
      normalized
    ) ||
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/.test(text);

  const base =
    0.2 +
    lengthFactor * 0.25 +
    (hasNumbers ? 0.08 : 0) +
    (hasMoney ? 0.1 : 0) +
    (hasDate ? 0.08 : 0) +
    (decisionKeywords ? 0.15 : 0) +
    (productOrPerson ? 0.12 : 0);

  const combined = (base + hintScore(hint)) / 2;
  return clamp(combined);
};

export const truncateIfNeeded = (text: string): string => {
  if (text.length <= env.maxTextLength) return text;
  return text.slice(0, env.maxTextLength);
};
