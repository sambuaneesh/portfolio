#!/usr/bin/env node
// Provisions or updates a row in aneesh_admin_users via the service-role key.
// Deliberately a standalone script, not app code or a committed migration -
// an admin's password hash should never end up in the browser bundle or in
// git history.
//
// Username/password are read from env vars, never CLI args - argv gets
// echoed back by npm, shells and process listings.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   ADMIN_BOOTSTRAP_USERNAME=... ADMIN_BOOTSTRAP_PASSWORD=... npm run create-admin

import bcrypt from 'bcryptjs';

const username = process.env.ADMIN_BOOTSTRAP_USERNAME;
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!username || !password) {
  console.error('Missing ADMIN_BOOTSTRAP_USERNAME / ADMIN_BOOTSTRAP_PASSWORD environment variables.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const password_hash = await bcrypt.hash(password, 10);

const res = await fetch(`${SUPABASE_URL}/rest/v1/aneesh_admin_users?on_conflict=username`, {
  method: 'POST',
  headers: {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify({ username, password_hash, is_active: true }),
});

if (!res.ok) {
  console.error(`Failed to create/update admin user: ${res.status} ${await res.text()}`);
  process.exit(1);
}

console.log(`Admin user "${username}" is ready.`);
