import { Request, Response, NextFunction } from 'express';
import { parcelService, ValidationError, ConflictError } from '../services/parcel.service.ts';

export const parcelController = {
  async createParcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const parcel = await parcelService.createParcel(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Parcel delivery requested successfully. Searching for nearby couriers...',
        data: parcel,
      });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  },

  async getSenderParcels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const parcels = await parcelService.getSenderParcels(req.user.id);
      res.status(200).json({ success: true, data: parcels, count: parcels.length });
    } catch (error) {
      next(error);
    }
  },

  async getParcelById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const { id } = req.params;
      const parcel = await parcelService.getParcelById(id, req.user.id, req.user.role);
      res.status(200).json({ success: true, data: parcel });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  },

  async getAvailableRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const requests = await parcelService.getAvailableRequests(req.user.id);
      res.status(200).json({ success: true, data: requests, count: requests.length });
    } catch (error) {
      next(error);
    }
  },

  async acceptParcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const { id } = req.params;
      const accepted = await parcelService.acceptParcel(req.user.id, id);
      res.status(200).json({ success: true, message: 'Parcel delivery accepted successfully.', data: accepted });
    } catch (error: any) {
      if (error instanceof ConflictError) {
        res.status(409).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  },

  async getActiveParcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const active = await parcelService.getActiveParcelForDriver(req.user.id);
      res.status(200).json({ success: true, data: active });
    } catch (error) {
      next(error);
    }
  },

  async verifyPickupOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const { id } = req.params;
      const { otp, evidenceUrl } = req.body || {};
      const updated = await parcelService.verifyPickupOtp(req.user.id, id, otp, evidenceUrl);
      res.status(200).json({ success: true, message: 'Pickup OTP verified successfully. Parcel collected.', data: updated });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const { id } = req.params;
      const { status, cancellationReason } = req.body || {};
      const updated = await parcelService.updateParcelStatus(req.user.id, id, status, cancellationReason);
      res.status(200).json({ success: true, message: 'Parcel status updated.', data: updated });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  },

  async verifyDeliveryOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const { id } = req.params;
      const { otp, evidenceUrl } = req.body || {};
      const updated = await parcelService.verifyDeliveryOtp(req.user.id, id, otp, evidenceUrl);
      res.status(200).json({ success: true, message: 'Delivery OTP verified successfully. Parcel delivered.', data: updated });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  },

  async cancelParcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      const { id } = req.params;
      const { reason } = req.body || {};
      const cancelled = await parcelService.cancelParcel(id, req.user.id, reason);
      res.status(200).json({ success: true, message: 'Parcel cancelled successfully.', data: cancelled });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  },

  async getAdminParcels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
        return;
      }
      const parcels = await parcelService.getAdminParcels();
      res.status(200).json({ success: true, data: parcels, count: parcels.length });
    } catch (error) {
      next(error);
    }
  }
};
