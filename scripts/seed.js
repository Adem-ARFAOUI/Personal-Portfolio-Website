/**
 * Creates (or resets) the admin account from ADMIN_EMAIL / ADMIN_PASSWORD in .env.
 * Run this once after setup, and again any time you want to change your password:
 *
 *   npm run seed
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../server/db");

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "Missing ADMIN_EMAIL or ADMIN_PASSWORD in your .env file. Copy .env.example to .env and fill it in first.",
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD should be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = db.find("users", (u) => u.email === email);

  if (existing) {
    await db.update("users", existing.id, { passwordHash });
    console.log(`Updated password for existing admin: ${email}`);
  } else {
    await db.insert("users", { email, passwordHash, role: "admin" });
    console.log(`Created admin account: ${email}`);
  }
  console.log("You can now log in at /admin");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
