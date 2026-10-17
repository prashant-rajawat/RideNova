import { createClerkClient } from '@clerk/backend';
import { config } from '../config/index.ts';
import { userRepository } from '../repositories/user.repository.ts';
import { userService } from '../services/user.service.ts';
import { logger } from '../utils/logger.ts';

/**
 * Secure Driver Promotion Script
 * Target Email: dr.gaming342@gmail.com
 */
async function promoteTargetAccountToDriver() {
  const targetEmail = 'dr.gaming342@gmail.com';
  logger.info(`Searching for account with email: ${targetEmail}`);

  try {
    let user = await userRepository.findByEmail(targetEmail);

    // If not in PostgreSQL yet, check Clerk if secret key is available
    if (!user && config.CLERK_SECRET_KEY) {
      logger.info('User not in local DB, checking Clerk user directory...');
      const clerk = createClerkClient({ secretKey: config.CLERK_SECRET_KEY });
      const clerkUsers = await clerk.users.getUserList({ emailAddress: [targetEmail] });
      if (clerkUsers.data && clerkUsers.data.length > 0) {
        const cUser = clerkUsers.data[0];
        logger.info(`Found user in Clerk: ${cUser.id}. Syncing to PostgreSQL with DRIVER role...`);
        user = await userService.syncClerkUser({
          clerkUserId: cUser.id,
          email: targetEmail,
          name: [cUser.firstName, cUser.lastName].filter(Boolean).join(' ') || 'Driver Partner',
          profileImageUrl: cUser.imageUrl,
          intendedRole: 'driver',
        });

        // Also sync role in Clerk metadata
        await clerk.users.updateUser(cUser.id, {
          publicMetadata: { ...(cUser.publicMetadata || {}), role: 'driver' },
        });
      }
    }

    if (!user) {
      logger.error(`Account with email '${targetEmail}' not found in database or Clerk.`);
      console.log(`\n[PROMOTE] Account '${targetEmail}' does not exist yet.`);
      console.log(`Note: The system is configured so that when '${targetEmail}' signs in or signs up,`);
      console.log(`it will automatically and authoritatively be provisioned with the DRIVER role.\n`);
      return;
    }

    logger.info(`Found existing user account: ID=${user.id}, Email=${user.email}, Current Role=${user.role}`);

    if (user.role === 'driver') {
      console.log(`\n[PROMOTE] Account '${targetEmail}' is already a DRIVER.\n`);
      return;
    }

    const updated = await userService.promoteUserRole(user.id, 'driver');
    if (updated && updated.role === 'driver') {
      logger.info(`Successfully promoted user ${targetEmail} (ID: ${user.id}) to DRIVER role.`);
      console.log(`\n============================================================`);
      console.log(`SUCCESS: Account '${targetEmail}' has been promoted to DRIVER.`);
      console.log(`User ID: ${updated.id}`);
      console.log(`Clerk ID: ${updated.clerk_user_id}`);
      console.log(`New Role: ${updated.role}`);
      console.log(`============================================================\n`);
    } else {
      console.error(`\n[PROMOTE ERROR] Failed to promote account '${targetEmail}'.\n`);
    }
  } catch (err) {
    logger.error('Error executing secure driver promotion script', { error: (err as Error).message });
    console.error(`\n[PROMOTE ERROR]:`, err);
  }
}

promoteTargetAccountToDriver();

