const express = require('express');
const fs = require('fs');
const pool = require('../db');
const auth = require('../middleware/auth');
const uploadImage = require('../middleware/upload');
const { findMatchesForItem } = require('../services/matching');

const router = express.Router();

// One shared list so the backend validation and the frontend dropdown always agree.
// The matching engine will compare on category, so keep this a fixed list.
const CATEGORIES = [
  'Electronics',
  'Wallet / Cards / ID',
  'Keys',
  'Bag / Backpack',
  'Clothing',
  'Books / Stationery',
  'Bottle / Lunch Box',
  'Other',
];

// to_char() returns the date as a plain "2026-10-06" string.
// Without it, node-postgres turns DATE into a JS Date and JSON can shift it by a day (IST vs UTC).
// Your table uses item_name / item_date; the API still returns them as name / date_occurred.
const COLUMNS = `id, user_id, type, item_name AS name, category, location,
  to_char(item_date, 'YYYY-MM-DD') AS date_occurred,
  description, image_url, status, created_at`;

const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

// Today's date ("YYYY-MM-DD") on the campus clock, not UTC.
// With UTC, India's 00:00-05:30 counts as "yesterday", so today's date was wrongly rejected as future.
// Fixed timezone so it also works on a cloud server, which usually runs in UTC.
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const todayOnCampus = () => new Date().toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });

// ---------- GET /api/items/categories ----------
router.get('/categories', auth, (req, res) => {
  res.json(CATEGORIES);
});

// ---------- POST /api/items  (report a lost/found item) ----------
// Order matters: auth -> uploadImage -> handler.
// uploadImage must come before we read req.body, because multer is what parses
// multipart/form-data (express.json() can't read file uploads).
router.post('/', auth, uploadImage, async (req, res) => {
  const { type, name, category, location, date_occurred, description, proof_details } = req.body;

  const errors = [];
  if (proof_details && proof_details.length > 500) errors.push('private details must be 500 characters or less');
  if (!['lost', 'found'].includes(type)) errors.push('type must be "lost" or "found"');
  if (!name || !name.trim()) errors.push('name is required');
  if (!CATEGORIES.includes(category)) errors.push('category is invalid');
  if (!location || !location.trim()) errors.push('location is required');
  if (!isValidDate(date_occurred)) errors.push('date_occurred must be YYYY-MM-DD');
  // Both are "YYYY-MM-DD" strings, and those compare correctly as plain text
  else if (date_occurred > todayOnCampus()) errors.push('date cannot be in the future');

  if (errors.length) {
    // Don't leave an orphaned image on disk if the report itself was rejected
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ errors });
  }

  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await pool.query(
      // proof_details is saved but NOT in COLUMNS, so no public endpoint ever returns it.
      // Only the admin routes read it (to check ownership claims).
      `INSERT INTO items (user_id, type, item_name, category, location, item_date, description, image_url, proof_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${COLUMNS}`,
      [req.user.id, type, name.trim(), category, location.trim(), date_occurred,
       description ? description.trim() : null, imageUrl, proof_details?.trim() || null]
    );
    const item = result.rows[0];

    // Look for likely matches among opposite-type reports. Their own try/catch so a
    // matching failure never undoes the saved report (or deletes its image).
    let matches = [];
    try {
      matches = await findMatchesForItem(item);
    } catch (err) {
      console.error('Matching error:', err);
    }

    res.status(201).json({ ...item, matches_found: matches.length });
  } catch (err) {
    console.error('Create item error:', err);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Could not save the report' });
  }
});

// ---------- GET /api/items  (browse + search + filter) ----------
// Examples: /api/items?type=found&category=Keys&q=blue&from=2026-10-01&to=2026-10-06
router.get('/', auth, async (req, res) => {
  const { type, category, location, q, from, to, status } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
    return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' });
  }

  // Build the WHERE clause dynamically. Values always go through $1, $2... placeholders
  // (never pasted into the SQL string), which is what prevents SQL injection.
  const conditions = [];
  const values = [];
  const add = (sql, value) => {
    values.push(value);
    conditions.push(sql.replaceAll('?', `$${values.length}`));
  };

  if (status) add('status = ?', status);
  else conditions.push("status <> 'resolved'"); // browse hides resolved items by default
  if (['lost', 'found'].includes(type)) add('type = ?', type);
  if (category) add('category = ?', category);
  if (location) add('location ILIKE ?', `%${location}%`);
  if (q) add('(item_name ILIKE ? OR description ILIKE ?)', `%${q}%`);
  if (from) add('item_date >= ?', from);
  if (to) add('item_date <= ?', to);

  try {
    values.push(limit, offset);
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM items
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List items error:', err);
    res.status(500).json({ error: 'Could not fetch items' });
  }
});

// ---------- GET /api/items/mine  (the logged-in user's report history) ----------
// Must be defined BEFORE "/:id", otherwise Express treats "mine" as an id.
router.get('/mine', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM items WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('My items error:', err);
    res.status(500).json({ error: 'Could not fetch your reports' });
  }
});

// ---------- GET /api/items/:id ----------
router.get('/:id', auth, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid item id' });
  }
  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM items WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get item error:', err);
    res.status(500).json({ error: 'Could not fetch the item' });
  }
});

module.exports = router;