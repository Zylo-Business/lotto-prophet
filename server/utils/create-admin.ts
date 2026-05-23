/**
 * Usage:
 *   npm run admin:create -- <email>              # promote existing user to admin
 *   npm run admin:create -- <email> <password>   # create a new admin account
 */
import { pool } from '../db/db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const [,, email, password] = process.argv;

if (!email) {
  console.error('Usage: npm run admin:create -- <email> [password]');
  process.exit(1);
}

async function main() {
  const existing = await pool.query(
    'SELECT id, email, role FROM users WHERE email = $1',
    [email.toLowerCase()],
  );

  if (existing.rows[0]) {
    const user = existing.rows[0];
    if (user.role === 'admin') {
      console.log(`ℹ️  ${email} is already an admin.`);
    } else {
      await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email.toLowerCase()]);
      console.log(`✅ Promoted ${email} to admin.`);
    }
  } else {
    if (!password) {
      console.error(`User ${email} not found. Provide a password to create a new admin account:`);
      console.error(`  npm run admin:create -- ${email} <password>`);
      process.exit(1);
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (firstname, surname, email, country_code, mobile_number, password_hash, date_of_birth, role)
       VALUES ('Admin', 'User', $1, '+1', '0000000000', $2, '1990-01-01', 'admin')`,
      [email.toLowerCase(), hash],
    );
    console.log(`✅ Created admin account: ${email}`);
  }

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
