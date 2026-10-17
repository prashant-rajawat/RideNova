import { userRepository } from '../repositories/user.repository.ts';
import { driverRepository } from '../repositories/driver.repository.ts';
import { User, UserRole } from '../types/index.ts';
import { logger } from '../utils/logger.ts';

export interface ClerkUserIdentity {
  clerkUserId: string;
  email: string;
  name: string;
  profileImageUrl?: string | null;
  phone?: string | null;
  intendedRole?: UserRole;
}

export interface SanitizedUser {
  id: string;
  clerkUserId: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function sanitizeUser(user: User): SanitizedUser {
  return {
    id: user.id,
    clerkUserId: user.clerk_user_id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    profileImageUrl: user.profile_image_url || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export const userService = {
  /**
   * Synchronize verified Clerk identity with application database.
   * If user does not exist, creates with verified role:
   * - 'admin' for admin emails
   * - 'driver' for driver registrations or dr.gaming342@gmail.com
   * - 'rider' for customer / rider accounts
   * If user exists, preserves existing verified role without downgrading.
   */
  async syncClerkUser(identity: ClerkUserIdentity): Promise<User> {
    if (!identity.clerkUserId) {
      throw new Error('Missing Clerk User ID in sync payload');
    }

    const normalizedEmail = identity.email ? identity.email.toLowerCase().trim() : '';
    const existing = await userRepository.findByClerkId(identity.clerkUserId);

    if (existing) {
      // Special check: ensure Dreambattle (projectwork3155@gmail.com / dreambattle@3155) has canonical ADMIN role
      const isDreambattle =
        normalizedEmail === 'projectwork3155@gmail.com' ||
        normalizedEmail === 'dreambattle@3155' ||
        normalizedEmail.includes('dreambattle');

      if (isDreambattle && existing.role !== 'admin') {
        const upgraded = await userRepository.updateRole(existing.id, 'admin');
        logger.info('Authoritatively promoted Dreambattle account to ADMIN role in database', {
          id: existing.id,
          email: existing.email,
        });
        return upgraded || existing;
      }

      // Special check: ensure dr.gaming342@gmail.com has DRIVER role
      if (normalizedEmail === 'dr.gaming342@gmail.com' && existing.role !== 'driver') {
        const upgraded = await userRepository.updateRole(existing.id, 'driver');
        await driverRepository.findOrCreate(existing.id);
        return upgraded || existing;
      }

      // If user is a driver, ensure driver record exists in drivers table
      if (existing.role === 'driver') {
        await driverRepository.findOrCreate(existing.id);
      }

      // User exists. Do NOT downgrade or alter role. Update profile info if changed.
      const hasNameChanged = identity.name && identity.name.trim() !== existing.name;
      const hasImageChanged =
        identity.profileImageUrl && identity.profileImageUrl !== existing.profile_image_url;

      if (hasNameChanged || hasImageChanged) {
        const updated = await userRepository.updateProfile(existing.id, {
          name: identity.name || existing.name,
          profile_image_url: identity.profileImageUrl || existing.profile_image_url,
        });
        return updated || existing;
      }

      return existing;
    }

    // New User Registration:
    // Whitelisted admin emails get 'admin'
    // Driver registration or dr.gaming342@gmail.com get 'driver'
    // Default customers get 'rider'
    let assignedDefaultRole: UserRole = 'rider';
    if (
      normalizedEmail === 'projectwork3155@gmail.com' ||
      normalizedEmail === 'dreambattle@3155' ||
      normalizedEmail.includes('dreambattle') ||
      normalizedEmail.includes('admin')
    ) {
      assignedDefaultRole = 'admin';
    } else if (normalizedEmail === 'dr.gaming342@gmail.com' || identity.intendedRole === 'driver') {
      assignedDefaultRole = 'driver';
    }

    logger.info('Auto-syncing new user into RideNova database', {
      clerkUserId: identity.clerkUserId,
      email: identity.email,
      assignedDefaultRole,
    });

    const newUser = await userRepository.create({
      clerk_user_id: identity.clerkUserId,
      role: assignedDefaultRole,
      name: identity.name || 'RideNova User',
      email: identity.email,
      phone: identity.phone || null,
      profile_image_url: identity.profileImageUrl || null,
    });

    // If driver, initialize corresponding driver record
    if (assignedDefaultRole === 'driver') {
      await driverRepository.findOrCreate(newUser.id);
    }

    return newUser;
  },

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkUserId: string): Promise<User | null> {
    return userRepository.findByClerkId(clerkUserId);
  },

  /**
   * Get user by Application DB ID
   */
  async getUserById(id: string): Promise<User | null> {
    return userRepository.findById(id);
  },

  /**
   * Update profile fields (safe: name, phone)
   */
  async updateProfile(
    userId: string,
    updates: { name?: string; phone?: string | null }
  ): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updated = await userRepository.updateProfile(userId, {
      name: updates.name,
      phone: updates.phone,
    });

    if (!updated) {
      throw new Error('Failed to update user profile');
    }

    return updated;
  },

  /**
   * Controlled backend role promotion (e.g. for onboarding verification or admin assignment).
   * Validates target role and updates backend database.
   */
  async promoteUserRole(userId: string, targetRole: UserRole): Promise<User> {
    const validRoles: UserRole[] = ['rider', 'driver', 'admin'];
    if (!validRoles.includes(targetRole)) {
      throw new Error(`Invalid role '${targetRole}'. Allowed roles: ${validRoles.join(', ')}`);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updated = await userRepository.updateRole(userId, targetRole);
    if (!updated) {
      throw new Error('Failed to update user role');
    }

    if (targetRole === 'driver') {
      await driverRepository.findOrCreate(userId);
    }

    logger.info('User role promoted via controlled backend mechanism', {
      userId,
      oldRole: user.role,
      newRole: targetRole,
    });

    return updated;
  },
};
