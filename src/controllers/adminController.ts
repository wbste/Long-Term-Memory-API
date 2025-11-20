import { Request, Response, NextFunction } from 'express';
import { MemoryService } from '../services/memoryService';

export class AdminController {
  constructor(private memoryService: MemoryService) {}

  prune = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.memoryService.pruneOldMemories(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
