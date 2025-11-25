import { Router } from 'express';
import { z } from 'zod';
import { MemoryController } from '../controllers/memoryController';
import { validate } from '../middleware/validate';
import { env } from '../config';

export const memoryRoutes = (controller: MemoryController) => {
  const router = Router();

  // --- ADAPTER SCHEMA ---
  // Din Frontend skickar "agentId" och "content". Din Backend vill ha "sessionId" och "text".
  // Denna kod översätter automatiskt mellan dem så du slipper ändra i Frontend.
  const storeSchema = z.object({
    body: z.object({
      sessionId: z.string().optional(),
      agentId: z.string().optional(), 
      text: z.string().optional(),
      content: z.string().optional(), 
      metadata: z.record(z.any()).optional(),
      importanceHint: z.enum(['low', 'medium', 'high']).optional()
    }).transform((data) => ({
      sessionId: data.sessionId || data.agentId,
      text: data.text || data.content,
      metadata: data.metadata,
      importanceHint: data.importanceHint
    })).refine((data) => data.sessionId && data.text, {
      message: "Missing required fields: sessionId (or agentId) and text (or content)",
      path: ["sessionId", "text"]
    })
  });

  const retrieveSchema = z.object({
    body: z.object({
      sessionId: z.string().optional(),
      agentId: z.string().optional(),
      query: z.string().min(1).max(env.maxTextLength),
      limit: z.number().int().positive().max(50).optional(),
      metadata: z.record(z.any()).optional()
    }).transform((data) => ({
      sessionId: data.sessionId || data.agentId,
      query: data.query,
      limit: data.limit,
      metadata: data.metadata
    })).refine((data) => data.sessionId, {
      message: "Missing required field: sessionId (or agentId)",
      path: ["sessionId"]
    })
  });

  const clearSchema = z.object({
    body: z.object({
      sessionId: z.string().min(1),
      memoryIds: z.array(z.string().min(1)).optional()
    })
  });

  // --- FIXADE RUTTER ---
  // Vi tar bort "/memory" härifrån eftersom det redan läggs på i app.ts
  
  // Matchar: POST /api/memory
  router.post('/', validate(storeSchema), controller.store);
  
  // Matchar: POST /api/memory/search
  router.post('/search', validate(retrieveSchema), controller.retrieve);
  
  // Matchar: POST /api/memory/clear
  router.post('/clear', validate(clearSchema), controller.clear);

  return router;
};
