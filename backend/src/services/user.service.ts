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
   * If user does not exist, creates with SAFE DEFAULT ROLE = 'rider'.
   * If user exists, preserves existing role and updates safe profile metadata if changed.
   */
  async syncClerkUser(identity: ClerkUserIdentity): Promise<User> {
    if (!identity.clerkUserId) {
      throw new Error('Missing Clerk User ID in sync payload');
    }

    const existing = await userRepository.findByClerkId(identity.clerkUserId);

    if (existing) {
      // User exists. Do NOT alter role. Update profile info if changed.
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

    // New User Registration: Assign safe default role 'rider'
    logger.info('Auto-syncing new Clerk user into RideNova database with default role: rider', {
      clerkUserId: identity.clerkUserId,
      email: identity.email,
    });

    const newUser = await userRepository.create({
      clerk_user_id: identity.clerkUserId,
      role: 'rider', // STRICT SAFE DEFAULT
      name: identity.name || 'RideNova Rider',
      email: identity.email,
      phone: identity.phone || null,
      profile_image_url: identity.profileImageUrl || null,
    });

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
