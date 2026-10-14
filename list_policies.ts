
import { query } from './backend/src/db/index.ts';

async function listPolicies() {
  const res = await query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'rides';
  `);
  console.log(res.rows);
}

listPolicies().catch(console.error);
