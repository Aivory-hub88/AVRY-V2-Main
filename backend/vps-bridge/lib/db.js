// lib/db.js — VPS PostgreSQL (avry-postgres) data access for the bridge.
// Formerly lib/supabase.js (Supabase retired); lib/supabase.js is now a shim to this file.
const { Pool } = require('pg');
try { require('dotenv').config(); } catch (e) {}

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'aivory',
  user: process.env.PGUSER || 'aivory',
  password: process.env.PGPASSWORD || 'AivoryApp2026!@#123',
  max: 5,
  idleTimeoutMillis: 30000,
});
pool.on('error', (e) => console.error('[pg] pool error:', e.message));

async function getUserEntitlements(userId) {
  try {
    const { rows } = await pool.query('SELECT * FROM user_tiers WHERE user_id = $1', [userId]);
    return rows[0] || null;
  } catch (e) { console.error('[pg] getUserEntitlements:', e.message); return null; }
}

async function getUserAccess(userId) {
  // users + live entitlement in one query; superadmin flags let internal
  // accounts bypass tier gates (monitoring / feature testing)
  try {
    const { rows } = await pool.query(
      `SELECT u.account_type, u.is_superadmin, t.tier, t.expires_at
       FROM users u LEFT JOIN user_tiers t ON t.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    return rows[0] || null;
  } catch (e) { console.error('[pg] getUserAccess:', e.message); return null; }
}

async function upsertEntitlement({ userId, tier, features, expiresAt }) {
  const { rows } = await pool.query(
    `INSERT INTO user_tiers (user_id, tier, features, expires_at, updated_at)
     VALUES ($1, $2, $3::jsonb, $4, now())
     ON CONFLICT (user_id) DO UPDATE SET tier = EXCLUDED.tier, features = EXCLUDED.features,
       expires_at = EXCLUDED.expires_at, updated_at = now()
     RETURNING *`,
    [userId, tier || 'free', JSON.stringify(features || []), expiresAt || null]
  );
  return rows[0];
}

async function recordStripeEvent({ eventId, eventType, userId, sessionId, amount, currency }) {
  await pool.query(
    `INSERT INTO stripe_events (event_id, event_type, user_id, session_id, amount, currency)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (event_id) DO NOTHING`,
    [eventId, eventType, userId, sessionId, amount, currency]
  );
}

// Back-compat shim for legacy supabaseDb.supabase.from(table).insert(row) (diagnostics persistence).
const supabase = {
  from(table) {
    return {
      async insert(row) {
        try {
          const cols = Object.keys(row);
          const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
          const vals = cols.map((c) => { const v = row[c]; return v !== null && typeof v === 'object' ? JSON.stringify(v) : v; });
          await pool.query(`INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${ph}) ON CONFLICT DO NOTHING`, vals);
          return { error: null };
        } catch (error) { return { error }; }
      },
    };
  },
};

module.exports = { supabase, getUserEntitlements, upsertEntitlement, recordStripeEvent, pool, getUserAccess };
