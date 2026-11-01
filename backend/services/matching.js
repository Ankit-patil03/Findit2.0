const pool = require('../db');
const { notifyAdmins } = require('./notify');

// ---------- Tunable settings (change these to make matching stricter or looser) ----------
const WEIGHTS = { category: 20, date: 20, location: 30, text: 30 }; // adds up to 100
const MATCH_THRESHOLD = 50; // scores at or above this are flagged for admin review
const MAX_DAY_GAP = 30;     // ignore reports whose dates are more than this many days apart

const MATCH_STATUS = { PENDING: 'pending', CONFIRMED: 'confirmed', REJECTED: 'rejected' };

const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'at', 'in', 'on', 'near', 'my', 'is', 'it', 'its', 'with', 'and',
  'or', 'for', 'to', 'by', 'from', 'this', 'that', 'left', 'lost', 'found', 'item', 'some', 'there',
]);

// "Blue Bottles, near Library!" -> ["blue", "bottle", "library"]
function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

function sharedWords(a, b) {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

// Overlap: shared words / words in the SHORTER text.
// "Library" vs "Central Library" = 1.0 (one place contained in the other)
const overlap = (a, b) => (a.size && b.size ? sharedWords(a, b) / Math.min(a.size, b.size) : 0);

// Dice: 2 * shared words / total words. Balanced similarity for descriptions.
const dice = (a, b) => (a.size && b.size ? (2 * sharedWords(a, b)) / (a.size + b.size) : 0);

// Closer dates score higher
function dateFactor(gapDays) {
  if (gapDays <= 1) return 1;
  if (gapDays <= 3) return 0.75;
  if (gapDays <= 7) return 0.5;
  if (gapDays <= 14) return 0.25;
  return 0;
}

// a and b are { name, category, location, description }. Returns a whole number 0-100.
function scoreMatch(a, b, dayGap) {
  const category = a.category === b.category ? WEIGHTS.category : 0;
  const date = WEIGHTS.date * dateFactor(dayGap);
  const location =
    WEIGHTS.location * overlap(new Set(tokenize(a.location)), new Set(tokenize(b.location)));
  const text =
    WEIGHTS.text *
    dice(
      new Set(tokenize(`${a.name} ${a.description || ''}`)),
      new Set(tokenize(`${b.name} ${b.description || ''}`))
    );
  return Math.round(category + date + location + text);
}

// Called right after a new report is saved.
// `item` is the report as returned by the API: { id, user_id, type, name, category, location, date_occurred, description }
// Compares it to opposite-type reports (a new LOST item is compared with FOUND items, and vice versa)
// and saves likely matches as 'pending' for the admin to review.
async function findMatchesForItem(item, db = pool) {
  const oppositeType = item.type === 'lost' ? 'found' : 'lost';

  const { rows } = await db.query(
    `SELECT id, item_name AS name, category, location, description,
            ABS(item_date - $4::date) AS day_gap
       FROM items
      WHERE type = $1
        AND category = $2
        AND user_id <> $3                         -- you can't match your own reports
        AND status NOT IN ('matched', 'resolved') -- skip items that are already taken care of
        AND ABS(item_date - $4::date) <= $5`,
    [oppositeType, item.category, item.user_id, item.date_occurred, MAX_DAY_GAP]
  );

  const created = [];
  for (const candidate of rows) {
    const score = scoreMatch(item, candidate, candidate.day_gap);
    if (score < MATCH_THRESHOLD) continue;

    const lostId = item.type === 'lost' ? item.id : candidate.id;
    const foundId = item.type === 'found' ? item.id : candidate.id;

    // NOT EXISTS stops the same lost/found pair from being saved twice
    const inserted = await db.query(
      `INSERT INTO matches (lost_item_id, found_item_id, match_score, status)
       SELECT $1::int, $2::int, $3::int, $4::varchar
        WHERE NOT EXISTS (
          SELECT 1 FROM matches WHERE lost_item_id = $1::int AND found_item_id = $2::int
        )
       RETURNING id, match_score`,
      [lostId, foundId, score, MATCH_STATUS.PENDING]
    );
    if (!inserted.rows.length) continue; // this pair was already saved earlier

    const newMatch = inserted.rows[0];
    created.push(newMatch);
    // Let the admins know there's something to review
    await notifyAdmins(db, `New possible match (score ${score}) needs review`, newMatch.id);
  }
  return created;
}

module.exports = { findMatchesForItem, scoreMatch, MATCH_STATUS, MATCH_THRESHOLD };