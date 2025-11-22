import { Memory, Prisma } from '@prisma/client';
import { prisma } from '../config';

// The raw query returns all fields from the Memory table plus a 'similarity' field.
// The 'embedding' field is not returned, as it's large and not needed by the application logic.
export type MemoryWithSimilarity = Omit<Memory, 'embedding'> & { similarity: number };

// The raw query for finding duplicates returns only the id.
export type DuplicateMemory = Pick<Memory, 'id'>;

export interface MemoryCreateInput {
  sessionId: string;
  text: string;
  compressedText: string;
  metadata?: Prisma.InputJsonValue;
  importanceScore: number;
  recencyScore?: number;
  embedding?: number[];
}

export interface IMemoryRepository {
  create(data: MemoryCreateInput): Promise<Memory>;
  findById(id: string): Promise<Memory | null>;
  findSimilarMemories(
    sessionId: string,
    embedding: number[],
    limit: number,
    minScore: number
  ): Promise<MemoryWithSimilarity[]>;
  findDuplicate(sessionId: string, embedding: number[]): Promise<DuplicateMemory | null>;
  updateLastAccessed(ids: string[], timestamp: Date): Promise<void>;
  softDelete(sessionId: string, memoryIds?: string[]): Promise<number>;
  softDeleteByIds(ids: string[]): Promise<number>;
  findPrunable(params: {
    createdBefore: Date;
    lastAccessedBefore: Date;
    maxImportance: number;
    take?: number;
  }): Promise<Memory[]>;
  countActive(sessionId: string): Promise<number>;
  latestAccessed(sessionId: string): Promise<Date | null>;
}

export class MemoryRepository implements IMemoryRepository {
  async create(data: MemoryCreateInput): Promise<Memory> {
    return prisma.memory.create({
      data: { ...data, embedding: data.embedding ?? [], isDeleted: false }
    });
  }

  async findById(id: string): Promise<Memory | null> {
    return prisma.memory.findUnique({
      where: { id, isDeleted: false }
    });
  }

  async findSimilarMemories(
    sessionId: string,
    embedding: number[],
    limit: number,
    minScore: number
  ): Promise<MemoryWithSimilarity[]> {
    const embeddingString = `[${embedding.join(',')}]`;

    // Important: We are casting the result of the raw query to the expected type.
    // Prisma's $queryRaw returns `unknown[]`, so we must be sure the query returns columns
    // that match the `MemoryWithSimilarity` type.
    // We are selecting all columns from the Memory table except the embedding itself,
    // and adding a calculated `similarity` column.
    const results = await prisma.$queryRaw<MemoryWithSimilarity[]>`
      SELECT
        "id",
        "content",
        "createdAt",
        "updatedAt",
        "lastAccessedAt",
        "importanceScore",
        "sessionId",
        "isDeleted",
        "metadata",
        1 - (embedding <=> ${embeddingString}::vector) as similarity
      FROM "Memory"
      WHERE
        "sessionId" = ${sessionId} AND
        "isDeleted" = false AND
        1 - (embedding <=> ${embeddingString}::vector) >= ${minScore}
      ORDER BY
        similarity * 0.7 + "importanceScore" * 0.3 DESC
      LIMIT ${limit}
    `;

    return results;
  }

  async findDuplicate(sessionId: string, embedding: number[]): Promise<DuplicateMemory | null> {
    const embeddingString = `[${embedding.join(',')}]`;
    const similarityThreshold = 0.95; // Very high similarity threshold for deduplication

    const results = await prisma.$queryRaw<DuplicateMemory[]>`
      SELECT "id"
      FROM "Memory"
      WHERE
        "sessionId" = ${sessionId} AND
        "isDeleted" = false AND
        "createdAt" >= NOW() - interval '24 hours' AND
        1 - (embedding <=> ${embeddingString}::vector) > ${similarityThreshold}
      LIMIT 1
    `;

    return results.length > 0 ? results[0] : null;
  }

  async updateLastAccessed(ids: string[], timestamp: Date): Promise<void> {
    if (!ids.length) return;
    await prisma.memory.updateMany({
      where: { id: { in: ids } },
      data: { lastAccessedAt: timestamp }
    });
  }

  async softDelete(sessionId: string, memoryIds?: string[]): Promise<number> {
    const result = await prisma.memory.updateMany({
      where: {
        sessionId,
        isDeleted: false,
        ...(memoryIds ? { id: { in: memoryIds } } : {})
      },
      data: { isDeleted: true }
    });
    return result.count;
  }

  async softDeleteByIds(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const result = await prisma.memory.updateMany({
      where: { id: { in: ids }, isDeleted: false },
      data: { isDeleted: true }
    });
    return result.count;
  }

  async findPrunable({
    createdBefore,
    lastAccessedBefore,
    maxImportance,
    take = 200
  }: {
    createdBefore: Date;
    lastAccessedBefore: Date;
    maxImportance: number;
    take?: number;
  }): Promise<Memory[]> {
    return prisma.memory.findMany({
      where: {
        isDeleted: false,
        createdAt: { lt: createdBefore },
        lastAccessedAt: { lt: lastAccessedBefore },
        importanceScore: { lte: maxImportance }
      },
      orderBy: [{ importanceScore: 'asc' }, { lastAccessedAt: 'asc' }],
      take
    });
  }

  async countActive(sessionId: string): Promise<number> {
    return prisma.memory.count({ where: { sessionId, isDeleted: false } });
  }

  async latestAccessed(sessionId: string): Promise<Date | null> {
    const memory = await prisma.memory.findFirst({
      where: { sessionId, isDeleted: false },
      orderBy: { lastAccessedAt: 'desc' },
      select: { lastAccessedAt: true }
    });
    return memory?.lastAccessedAt || null;
  }
}
