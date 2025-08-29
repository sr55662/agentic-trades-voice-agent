/**
 * scripts/purge_retention.ts
 * Deletes/anonymizes rows beyond retention horizon.
 * Use with a scheduled job (e.g., ECS Scheduled Task).
 */
import { pool } from '../src/lib/db';
import { retentionDays } from '../src/lib/config';

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `DELETE FROM calls
       WHERE retention_until IS NOT NULL AND retention_until < now()`
    );
    console.log(JSON.stringify({ deleted_calls: res.rowCount, retention_days: retentionDays }));
  } finally {
    client.release();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
