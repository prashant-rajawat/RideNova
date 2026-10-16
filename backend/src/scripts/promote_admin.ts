import { userRepository } from '../repositories/user.repository.ts';
import { userService } from '../services/user.service.ts';
import { logger } from '../utils/logger.ts';

/**
 * Secure Admin Promotion Script
 * Target Email: Dreambattle@3155
 */
async function promoteTargetAccountToAdmin() {
  const targetEmail = 'Dreambattle@3155';
  logger.info(`Searching for account with email: ${targetEmail}`);

  try {
    const user = await userRepository.findByEmail(targetEmail);
    if (!user) {
      logger.error(`Account with email '${targetEmail}' not found in database.`);
      console.log(`\n[PROMOTE] Account '${targetEmail}' does not exist yet.`);
      console.log(`Please sign up or sign in through the Clerk application first so the account is synchronized to PostgreSQL.\n`);
      return;
    }

    logger.info(`Found existing user account: ID=${user.id}, Email=${user.email}, Current Role=${user.role}`);

    if (user.role === 'admin') {
      console.log(`\n[PROMOTE] Account '${targetEmail}' is already an ADMIN.\n`);
      return;
    }

    const updated = await userService.promoteUserRole(user.id, 'admin');
    if (updated && updated.role === 'admin') {
      logger.info(`Successfully promoted user ${targetEmail} (ID: ${user.id}) to ADMIN role.`);
      console.log(`\n============================================================`);
      console.log(`SUCCESS: Account '${targetEmail}' has been promoted to ADMIN.`);
      console.log(`User ID: ${updated.id}`);
      console.log(`Clerk ID: ${updated.clerk_user_id}`);
      console.log(`New Role: ${updated.role}`);
      console.log(`============================================================\n`);
    } else {
      console.error(`\n[PROMOTE ERROR] Failed to promote account '${targetEmail}'.\n`);
    }
  } catch (err) {
    logger.error('Error executing secure admin promotion script', { error: (err as Error).message });
    console.error(`\n[PROMOTE ERROR]:`, err);
  }
}

promoteTargetAccountToAdmin();
