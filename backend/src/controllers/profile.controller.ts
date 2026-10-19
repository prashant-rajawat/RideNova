import { Request, Response, NextFunction } from 'express';
import { profileRepository } from '../repositories/profile.repository.ts';
import { userRepository } from '../repositories/user.repository.ts';

export const profileController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      
      const [extension, emergencyContacts, safetyPrefs, freshUser] = await Promise.all([
        profileRepository.getExtension(req.user.id),
        profileRepository.getEmergencyContacts(req.user.id),
        profileRepository.getSafetyPreferences(req.user.id),
        userRepository.findById(req.user.id)
      ]);
      
      res.status(200).json({ 
        success: true, 
        data: { 
          user: freshUser || req.user, 
          extension, 
          emergencyContacts, 
          safetyPrefs 
        } 
      });
    } catch (err) {
      next(err);
    }
  },

  async updateExtension(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      // If legal_name is provided and not empty, sync with users table
      if (req.body.legal_name && typeof req.body.legal_name === 'string') {
        const trimmedName = req.body.legal_name.trim();
        if (trimmedName.length > 0) {
          await userRepository.updateProfile(req.user.id, { name: trimmedName });
        }
      }

      // If primary phone is provided in request body, sync with users table
      if (req.body.phone && typeof req.body.phone === 'string') {
        await userRepository.updateProfile(req.user.id, { phone: req.body.phone.trim() });
      }

      const updated = await profileRepository.upsertExtension(req.user.id, req.body);
      const freshUser = await userRepository.findById(req.user.id);

      res.status(200).json({ 
        success: true, 
        data: updated,
        user: freshUser || req.user
      });
    } catch (err) {
      next(err);
    }
  },

  async addEmergencyContact(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const { name, relationship, phone_number, is_primary } = req.body;
      if (!name || !relationship || !phone_number) {
        return res.status(400).json({ 
          success: false, 
          error: 'Name, relationship, and phone number are required.' 
        });
      }

      const added = await profileRepository.addEmergencyContact(req.user.id, {
        name: name.trim(),
        relationship: relationship.trim(),
        phone_number: phone_number.trim(),
        is_primary: Boolean(is_primary)
      });
      res.status(201).json({ success: true, data: added });
    } catch (err) {
      next(err);
    }
  },
  
  async deleteEmergencyContact(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const deleted = await profileRepository.deleteEmergencyContact(req.user.id, req.params.contactId);
      if (!deleted) return res.status(404).json({ success: false, error: 'Contact not found' });
      res.status(200).json({ success: true, message: 'Contact deleted' });
    } catch (err) {
      next(err);
    }
  },

  async updateSafetyPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const updated = await profileRepository.upsertSafetyPreferences(req.user.id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
};
