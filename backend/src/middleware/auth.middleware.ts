import { Request, Response, NextFunction } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { config } from '../config/index.ts';
import { userService, ClerkUserIdentity } from '../services/user.service.ts';
import { User } from '../types/index.ts';
import { logger } from '../utils/logger.ts';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: User;
      auth?: {
        userId: string;
      };
    }
  }
}

// Initialize Clerk client if secret key is present
const clerkClient = config.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: config.CLERK_SECRET_KEY })
  : null;

/**
 * Reusable Authentication Middleware
 * Verifies Clerk session token, synchronizes/retrieves user from PostgreSQL,
 * and attaches verified user to req.user.
 * Rejects unauthenticated requests with HTTP 401.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Bearer token missing.',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1]?.trim();

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Token is empty.',
      },
    });
    return;
  }

  let verifiedClerkUserId: string | null = null;
  let identity: ClerkUserIdentity | null = null;

  // 1. Verification with official Clerk Backend SDK if configured
  if (config.CLERK_SECRET_KEY && clerkClient) {
    try {
      const verifiedToken = await verifyToken(token, {
        secretKey: config.CLERK_SECRET_KEY,
      });

      if (verifiedToken && verifiedToken.sub) {
        verifiedClerkUserId = verifiedToken.sub;

        // Fetch verified user profile details from Clerk
        try {
          const clerkUser = await clerkClient.users.getUser(verifiedClerkUserId);
          const primaryEmail =
            clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
            clerkUser.emailAddresses[0]?.emailAddress ||
            `${verifiedClerkUserId}@example.com`;

          const fullName =
            [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
            clerkUser.username ||
            'RideNova User';

          const clerkRole = (clerkUser.publicMetadata?.role ||
            clerkUser.unsafeMetadata?.role) as any;

          identity = {
            clerkUserId: verifiedClerkUserId,
            email: primaryEmail,
            name: fullName,
            profileImageUrl: clerkUser.imageUrl,
            phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
            intendedRole: clerkRole,
          };
        } catch (fetchErr) {
          logger.warn('Failed to retrieve full profile from Clerk API, using token claims', {
            error: (fetchErr as Error).message,
            clerkUserId: verifiedClerkUserId,
          });
          identity = {
            clerkUserId: verifiedClerkUserId,
            email: `${verifiedClerkUserId}@clerk.user`,
            name: 'RideNova User',
          };
        }
      }
    } catch (err) {
      logger.warn('Clerk token verification rejected', { error: (err as Error).message });
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session token.',
        },
      });
      return;
    }
  }

  // 2. Safe development / automated testing token support
  if (!verifiedClerkUserId && config.NODE_ENV !== 'production') {
    if (token.startsWith('dev_test_token_')) {
      const parts = token.replace('dev_test_token_', '').split(':');
      verifiedClerkUserId = parts[0];
      const roleHint = parts[1] || 'rider';
      const email = parts[2] || `${verifiedClerkUserId}@test.ridenova.com`;
      const name = parts[3] ? decodeURIComponent(parts[3]) : `Test ${roleHint.toUpperCase()}`;

      identity = {
        clerkUserId: verifiedClerkUserId,
        email,
        name,
        profileImageUrl: null,
        intendedRole: roleHint as any,
      };
    } else if (req.headers['x-test-clerk-user-id']) {
      verifiedClerkUserId = req.headers['x-test-clerk-user-id'] as string;
      identity = {
        clerkUserId: verifiedClerkUserId,
        email: `${verifiedClerkUserId}@test.ridenova.com`,
        name: 'Test Rider',
      };
    }
  }

  if (!verifiedClerkUserId || !identity) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authentication credentials.',
      },
    });
    return;
  }

  try {
    // 3. Synchronize with application database and assign/load role
    const dbUser = await userService.syncClerkUser(identity);

    // Attach verified user to request
    req.user = dbUser;
    req.auth = {
      userId: verifiedClerkUserId,
    };

    next();
  } catch (error) {
    logger.error('Failed to sync or retrieve authenticated application user', {
      error: (error as Error).message,
      clerkUserId: verifiedClerkUserId,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify user profile in database.',
      },
    });
  }
}
