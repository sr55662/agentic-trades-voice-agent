/**
 * scripts/purge_holds.ts
 * Remove expired booking holds to prevent resource starvation.
 */
import { pool } from '../src/lib/db';

async function main() {
  const res = await pool.query(`DELETE FROM booking_holds WHERE expires_at < now()`);
  console.log(JSON.stringify({ deleted_holds: res.rowCount }));
}
main().catch(e => { console.error(e); process.exit(1); });
