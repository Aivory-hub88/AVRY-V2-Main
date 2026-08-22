// Legacy name shim — the real module is lib/db.js (local PostgreSQL, NOT Supabase).
module.exports = require('./db');
