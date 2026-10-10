import { query, isDatabaseConfigured } from '../db/index.ts';
import { User, UserRole } from '../types/index.ts';
import { logger } from '../utils/logger.ts';

// In-memory user store for development/testing when DATABASE_URL is not yet connected
const memoryUsers = new Map<string, User>();

export interface CreateUserData {
  clerk_user_id: string;
  role?: UserRole;
  name: string;
  email: string;
  phone?: string | null;
  profile_image_url?: string | null;
}

export interface UpdateUserProfileData {
  name?: string;
  phone?: string | null;
  profile_image_url?: string | null;
}

export const userRepository = {
  /**
   * Find a user by Clerk User ID
   */
  async findByClerkId(clerkUserId: string): Promise<User | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<User>(
          `SELECT id, clerk_user_id, role, name, email, phone, profile_image_url, created_at, updated_at 
           FROM users 
           WHERE clerk_user_id = $1 
           LIMIT 1`,
          [clerkUserId]
        );
        return res.rows[0] || null;
      } catch (error) {
        logger.error('Error querying user by clerk_user_id', {
          error: (error as Error).message,
          clerkUserId,
        });
        throw error;
      }
    }

    // Memory fallback
    for (const user of memoryUsers.values()) {
      if (user.clerk_user_id === clerkUserId) {
        return { ...user };
      }
    }
    return null;
  },

  /**
   * Find a user by application database UUID
   */
  async findById(id: string): Promise<User | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<User>(
          `SELECT id, clerk_user_id, role, name, email, phone, profile_image_url, created_at, updated_at 
           FROM users 
           WHERE id = $1 
           LIMIT 1`,
          [id]
        );
        return res.rows[0] || null;
      } catch (error) {
        logger.error('Error querying user by id', {
          error: (error as Error).message,
          id,
        });
        throw error;
      }
    }

    const user = memoryUsers.get(id);
    return user ? { ...user } : null;
  },

  /**
   * Find a user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    if (isDatabaseConfigured()) {
      try {
        const res = await query<User>(
          `SELECT id, clerk_user_id, role, name, email, phone, profile_image_url, created_at, updated_at 
           FROM users 
           WHERE LOWER(email) = $1 
           LIMIT 1`,
          [normalizedEmail]
        );
        return res.rows[0] || null;
      } catch (error) {
        logger.error('Error querying user by email', {
          error: (error as Error).message,
          email: normalizedEmail,
        });
        throw error;
      }
    }

    for (const user of memoryUsers.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        return { ...user };
      }
    }
    return null;
  },

  /**
   * Create a new user with default 'rider' role
   */
  async create(data: CreateUserData): Promise<User> {
    const role: UserRole = data.role || 'rider';
    const normalizedEmail = data.email.toLowerCase().trim();

    if (isDatabaseConfigured()) {
      try {
        const res = await query<User>(
          `INSERT INTO users (clerk_user_id, role, name, email, phone, profile_image_url) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING id, clerk_user_id, role, name, email, phone, profile_image_url, created_at, updated_at`,
          [
            data.clerk_user_id,
            role,
            data.name.trim(),
            normalizedEmail,
            data.phone || null,
            data.profile_image_url || null,
          ]
        );
        logger.info('Created new application user in PostgreSQL', {
          userId: res.rows[0].id,
          clerkUserId: data.clerk_user_id,
          role,
        });
        return res.rows[0];
      } catch (error) {
        logger.error('Error creating user in PostgreSQL', {
          error: (error as Error).message,
          clerkUserId: data.clerk_user_id,
        });
        throw error;
      }
    }

    // Memory fallback
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const newUser: User = {
      id,
      clerk_user_id: data.clerk_user_id,
      role,
      name: data.name.trim(),
      email: normalizedEmail,
      phone: data.phone || null,
      profile_image_url: data.profile_image_url || null,
      created_at: now,
      updated_at: now,
    };
    memoryUsers.set(id, newUser);
    logger.info('Created new application user in memory store', {
      userId: id,
      clerkUserId: data.clerk_user_id,
      role,
    });
    return { ...newUser };
  },

  /**
   * Update profile fields (safe fields only: name, phone, profile_image_url)
   */
  async updateProfile(id: string, updates: UpdateUserProfileData): Promise<User | null> {
    if (isDatabaseConfigured()) {
      try {
        const setClauses: string[] = [];
        const values: unknown[] = [];
        let index = 1;

        if (updates.name !== undefined) {
          setClauses.push(`name = $${index++}`);
          values.push(updates.name.trim());
        }
        if (updates.phone !== undefined) {
          setClauses.push(`phone = $${index++}`);
          values.push(updates.phone);
        }
        if (updates.profile_image_url !== undefined) {
          setClauses.push(`profile_image_url = $${index++}`);
          values.push(updates.profile_image_url);
        }

        if (setClauses.length === 0) {
          return this.findById(id);
        }

        setClauses.push(`updated_at = NOW()`);
        values.push(id);

        const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${index} 
                     RETURNING id, clerk_user_id, role, name, email, phone, profile_image_url, created_at, updated_at`;

        const res = await query<User>(sql, values);
        return res.rows[0] || null;
      } catch (error) {
        logger.error('Error updating user profile', {
          error: (error as Error).message,
          id,
        });
        throw error;
      }
    }

    const user = memoryUsers.get(id);
    if (!user) return null;

    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.profile_image_url !== undefined) user.profile_image_url = updates.profile_image_url;
    user.updated_at = new Date().toISOString();

    memoryUsers.set(id, user);
    return { ...user };
  },

  /**
   * Controlled role update on the backend
   */
  async updateRole(id: string, role: UserRole): Promise<User | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<User>(
          `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 
           RETURNING id, clerk_user_id, role, name, email, phone, profile_image_url, created_at, updated_at`,
          [role, id]
        );
        logger.info('Updated user role in database', { id, role });
        return res.rows[0] || null;
      } catch (error) {
        logger.error('Error updating user role', {
          error: (error as Error).message,
          id,
          role,
        });
        throw error;
      }
    }

    const user = memoryUsers.get(id);
    if (!user) return null;

    user.role = role;
    user.updated_at = new Date().toISOString();
    memoryUsers.set(id, user);
    logger.info('Updated user role in memory store', { id, role });
    return { ...user };
  },

  /**
   * Reset store (used for automated testing)
   */
  clearMemoryStore(): void {
    memoryUsers.clear();
  },
};
