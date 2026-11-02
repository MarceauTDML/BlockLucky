import { Request, Response, NextFunction } from 'express';
import analyticsService from './analytics.services';
import { sendSuccess } from '../../utils/response.util';

export class AnalyticsController {
  public async trackEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await analyticsService.trackEvent({
        ...(req.user?.userId ? { userId: req.user.userId } : {}),
        eventType: req.body.eventType,
        utmSource: req.body.utmSource,
        metadata: req.body.metadata,
      });
      sendSuccess(res, { event }, 'Événement analytique enregistré', 201);
    } catch (error) {
      next(error);
    }
  }

  public async getDashboardMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await analyticsService.getDashboardAnalytics();
      sendSuccess(res, metrics, 'Données analytiques et démographiques récupérées');
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
export default analyticsController;
