import { query, isDatabaseConfigured } from '../db/index.ts';
import { UserProfileExtension, EmergencyContact, SafetyPreferences } from '../types/index.ts';
import { logger } from '../utils/logger.ts';

const memoryProfiles = new Map<string, UserProfileExtension>();
const memoryEmergencyContacts = new Map<string, EmergencyContact[]>();
const memorySafetyPrefs = new Map<string, SafetyPreferences>();

function calculateCompletionPercentage(
  extension: Partial<UserProfileExtension>,
  contactCount: number = 0,
  safetyPref: SafetyPreferences | null = null
): number {
  let score = 0;
  // Personal Info (40%)
  if (extension.legal_name && extension.legal_name.trim().length > 0) score += 15;
  if (extension.display_name || extension.date_of_birth || extension.gender) score += 10;
  if (extension.city && extension.city.trim().length > 0) score += 15;

  // Address Details (20%)
  if (extension.address_line1 || extension.state || extension.postal_code) score += 15;
  if (extension.landmark || extension.address_line2) score += 5;

  // Language & Contact (20%)
  if (extension.preferred_language) score += 10;
  if (extension.alternate_phone) score += 10;

  // Emergency & Safety (20%)
  if (contactCount > 0) score += 10;
  if (safetyPref && (safetyPref.consent_given || safetyPref.accessibility_notes || safetyPref.emergency_notes)) score += 10;

  return Math.min(100, Math.max(10, score));
}

export const profileRepository = {
  // ==================== PROFILE EXTENSIONS ====================
  async getExtension(userId: string): Promise<UserProfileExtension | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<UserProfileExtension>(
          `SELECT * FROM user_profile_extensions WHERE user_id = $1`,
          [userId]
        );
        return res.rows[0] || null;
      } catch (err) {
        logger.error('Error fetching profile extension', { userId, error: (err as Error).message });
      }
    }
    return memoryProfiles.get(userId) || null;
  },

  async upsertExtension(userId: string, data: Partial<UserProfileExtension>): Promise<UserProfileExtension> {
    const existing = await this.getExtension(userId);
    const contacts = await this.getEmergencyContacts(userId);
    const safety = await this.getSafetyPreferences(userId);

    const mergedData = {
      ...(existing || {}),
      ...data,
      user_id: userId,
    };

    const completion = calculateCompletionPercentage(mergedData, contacts.length, safety);
    mergedData.profile_completion_percentage = completion;
    mergedData.updated_at = new Date().toISOString();

    const fields = Object.keys(mergedData).filter(k => k !== 'user_id');
    const values = fields.map(k => (mergedData as any)[k]);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    if (isDatabaseConfigured() && fields.length > 0) {
      try {
        const res = await query<UserProfileExtension>(
          `INSERT INTO user_profile_extensions (user_id, ${fields.join(', ')})
           VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(', ')})
           ON CONFLICT (user_id) DO UPDATE SET ${setClause}, updated_at = NOW()
           RETURNING *`,
          [userId, ...values]
        );
        return res.rows[0];
      } catch (err) {
        logger.error('Error upserting profile extension in db, updating in memory', { userId, error: (err as Error).message });
      }
    }

    const defaultExt: UserProfileExtension = {
      user_id: userId,
      legal_name: null,
      display_name: null,
      date_of_birth: null,
      gender: null,
      city: null,
      state: null,
      country: 'India',
      postal_code: null,
      address_line1: null,
      address_line2: null,
      landmark: null,
      alternate_phone: null,
      preferred_language: 'English',
      profile_completion_percentage: completion,
      updated_at: new Date().toISOString(),
    };

    const finalProfile: UserProfileExtension = {
      ...defaultExt,
      ...(existing || {}),
      ...mergedData,
    };

    memoryProfiles.set(userId, finalProfile);
    return finalProfile;
  },

  // ==================== EMERGENCY CONTACTS ====================
  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<EmergencyContact>(
          `SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC`,
          [userId]
        );
        return res.rows;
      } catch (err) {
        logger.error('Error fetching emergency contacts', { userId, error: (err as Error).message });
      }
    }
    return memoryEmergencyContacts.get(userId) || [];
  },

  async addEmergencyContact(
    userId: string,
    contact: Omit<EmergencyContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<EmergencyContact> {
    // If set to primary, unmark other primary contacts
    if (contact.is_primary) {
      if (isDatabaseConfigured()) {
        try {
          await query(`UPDATE emergency_contacts SET is_primary = FALSE WHERE user_id = $1`, [userId]);
        } catch (err) {
          logger.error('Error unmarking primary emergency contacts', { error: (err as Error).message });
        }
      }
      const existingList = memoryEmergencyContacts.get(userId) || [];
      existingList.forEach(c => { c.is_primary = false; });
    }

    if (isDatabaseConfigured()) {
      try {
        const res = await query<EmergencyContact>(
          `INSERT INTO emergency_contacts (user_id, name, relationship, phone_number, is_primary)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [userId, contact.name, contact.relationship, contact.phone_number, contact.is_primary]
        );
        // Re-compute profile completion
        const ext = await this.getExtension(userId);
        if (ext) {
          await this.upsertExtension(userId, ext);
        }
        return res.rows[0];
      } catch (err) {
        logger.error('Error adding emergency contact to db', { userId, error: (err as Error).message });
      }
    }

    const newContact: EmergencyContact = {
      ...contact,
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const list = memoryEmergencyContacts.get(userId) || [];
    list.push(newContact);
    memoryEmergencyContacts.set(userId, list);

    // Re-compute profile completion
    const ext = memoryProfiles.get(userId);
    if (ext) {
      this.upsertExtension(userId, ext).catch(() => {});
    }

    return newContact;
  },

  async deleteEmergencyContact(userId: string, contactId: string): Promise<boolean> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query(`DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2`, [contactId, userId]);
        if ((res.rowCount || 0) > 0) {
          const ext = await this.getExtension(userId);
          if (ext) {
            await this.upsertExtension(userId, ext);
          }
          return true;
        }
      } catch (err) {
        logger.error('Error deleting emergency contact from db', { userId, contactId, error: (err as Error).message });
      }
    }
    const list = memoryEmergencyContacts.get(userId) || [];
    const newList = list.filter(c => c.id !== contactId);
    if (list.length === newList.length) return false;
    memoryEmergencyContacts.set(userId, newList);

    const ext = memoryProfiles.get(userId);
    if (ext) {
      this.upsertExtension(userId, ext).catch(() => {});
    }
    return true;
  },

  // ==================== SAFETY PREFERENCES ====================
  async getSafetyPreferences(userId: string): Promise<SafetyPreferences | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<SafetyPreferences>(
          `SELECT * FROM safety_preferences WHERE user_id = $1`,
          [userId]
        );
        return res.rows[0] || null;
      } catch (err) {
        logger.error('Error fetching safety preferences', { userId, error: (err as Error).message });
      }
    }
    return memorySafetyPrefs.get(userId) || null;
  },

  async upsertSafetyPreferences(userId: string, data: Partial<SafetyPreferences>): Promise<SafetyPreferences> {
    const existing = await this.getSafetyPreferences(userId);
    const merged = {
      ...(existing || {}),
      ...data,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    const fields = Object.keys(data).filter(k => k !== 'user_id');
    const values = fields.map(k => (merged as any)[k]);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    if (isDatabaseConfigured() && fields.length > 0) {
      try {
        const res = await query<SafetyPreferences>(
          `INSERT INTO safety_preferences (user_id, ${fields.join(', ')})
           VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(', ')})
           ON CONFLICT (user_id) DO UPDATE SET ${setClause}, updated_at = NOW()
           RETURNING *`,
          [userId, ...values]
        );
        // Re-compute profile completion
        const ext = await this.getExtension(userId);
        if (ext) {
          await this.upsertExtension(userId, ext);
        }
        return res.rows[0];
      } catch (err) {
        logger.error('Error upserting safety preferences', { userId, error: (err as Error).message });
      }
    }

    const defaultPrefs: SafetyPreferences = {
      user_id: userId,
      accessibility_notes: null,
      emergency_notes: null,
      consent_given: false,
      updated_at: new Date().toISOString(),
    };

    const finalPrefs: SafetyPreferences = {
      ...defaultPrefs,
      ...merged,
    };

    memorySafetyPrefs.set(userId, finalPrefs);

    const ext = memoryProfiles.get(userId);
    if (ext) {
      this.upsertExtension(userId, ext).catch(() => {});
    }

    return finalPrefs;
  },

  // Helper for admin inspection
  getMemoryProfile(userId: string): UserProfileExtension | null {
    return memoryProfiles.get(userId) || null;
  },
  getMemoryEmergencyContacts(userId: string): EmergencyContact[] {
    return memoryEmergencyContacts.get(userId) || [];
  },
  getMemorySafetyPreferences(userId: string): SafetyPreferences | null {
    return memorySafetyPrefs.get(userId) || null;
  },
};
