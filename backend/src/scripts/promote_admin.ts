import { createClerkClient } from '@clerk/backend';
import { config } from '../config/index.ts';
import { userRepository } from '../repositories/user.repository.ts';
import { userService } from '../services/user.service.ts';
import { logger } from '../utils/logger.ts';

/**
 * Secure Admin Promotion Script
 * Target: Dreambattle (Verified Email: projectwork3155@gmail.com)
 */
async function promoteTargetAccountToAdmin() {
  const verifiedEmail = 'projectwork3155@gmail.com';
  const legacyAliases = ['dreambattle@3155', 'dreambattle@gmail.com'];
  const searchCandidates = [verifiedEmail, ...legacyAliases];

  logger.info(`Searching for Dreambattle account with email: ${verifiedEmail}`);
  console.log(`\n============================================================`);
  console.log(`[ADMIN PROMOTION] Verifying Dreambattle Account...`);
  console.log(`Verified Email: ${verifiedEmail}`);

  try {
    let user = null;
    for (const email of searchCandidates) {
      user = await userRepository.findByEmail(email);
      if (user) break;
    }

    // If not in database yet, check Clerk if secret key is present
    if (!user && config.CLERK_SECRET_KEY) {
      logger.info('User not in local DB, querying Clerk directory...');
      const clerk = createClerkClient({ secretKey: config.CLERK_SECRET_KEY });
      const clerkUsers = await clerk.users.getUserList({ emailAddress: [verifiedEmail] });
      if (clerkUsers.data && clerkUsers.data.length > 0) {
        const cUser = clerkUsers.data[0];
        logger.info(`Found user in Clerk: ${cUser.id}. Syncing to database with ADMIN role...`);
        user = await userService.syncClerkUser({
          clerkUserId: cUser.id,
          email: verifiedEmail,
          name: [cUser.firstName, cUser.lastName].filter(Boolean).join(' ') || 'Dreambattle',
          profileImageUrl: cUser.imageUrl,
          intendedRole: 'admin',
        });

        // Sync Clerk publicMetadata
        await clerk.users.updateUser(cUser.id, {
          publicMetadata: { ...(cUser.publicMetadata || {}), role: 'admin' },
        });
      }
    }

    // If still not present in database, provision authoritative admin record
    if (!user) {
      logger.info('Account not yet in database. Pre-provisioning authoritative ADMIN record for verified email...');
      const clerkId = `user_email_${verifiedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      user = await userRepository.create({
        clerk_user_id: clerkId,
        role: 'admin',
        name: 'Dreambattle',
        email: verifiedEmail,
      });
      console.log(`Pre-provisioned authoritative ADMIN record in database.`);
    }

    logger.info(`Found user account: ID=${user.id}, Email=${user.email}, Role=${user.role}`);

    if (user.role !== 'admin') {
      const updated = await userService.promoteUserRole(user.id, 'admin');
      if (updated && updated.role === 'admin') {
        user = updated;
      }
    }

    console.log(`\nSUCCESS: Dreambattle account has been confirmed as ADMIN.`);
    console.log(`User Database ID: ${user.id}`);
    console.log(`Clerk User ID:    ${user.clerk_user_id}`);
    console.log(`Verified Email:   ${user.email}`);
    console.log(`Role:             ${user.role.toUpperCase()}`);
    console.log(`============================================================\n`);
  } catch (err) {
    logger.error('Error executing secure admin promotion script', { error: (err as Error).message });
    console.error(`\n[PROMOTE ERROR]:`, err);
  }
}

promoteTargetAccountToAdmin();

