import { pool } from '../src/lib/db';

(async () => {
  try {
    const res = await pool.query(`DELETE FROM booking_holds WHERE expires_at < now() RETURNING id`);
    console.log(`Purged ${res.rowCount} expired holds`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
})();
