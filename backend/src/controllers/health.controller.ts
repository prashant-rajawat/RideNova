import { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service.ts';

export const healthController = {
  getApiHealth(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = healthService.getApiHealth();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getDbHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await healthService.getDbHealth();
      // Returns 200 with clear status payload indicating whether configured/connected
      res.status(result.connected ? 200 : 200).json(result);
    } catch (error) {
      next(error);
    }
  },
};
