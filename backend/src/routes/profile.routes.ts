import { Router } from 'express';
import { profileController } from '../controllers/profile.controller.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';

const router = Router();

router.use(requireAuth);

router.get('/', profileController.getProfile);
router.patch('/extension', profileController.updateExtension);
router.post('/emergency-contacts', profileController.addEmergencyContact);
router.delete('/emergency-contacts/:contactId', profileController.deleteEmergencyContact);
router.patch('/safety-preferences', profileController.updateSafetyPreferences);

export default router;
