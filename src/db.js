import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {
  DATABASE_URL: connectionString,
  NODE_ENV: nodeEnv = 'development',
} = process.env;

// Notum SSL tengingu við gagnagrunn ef við erum *ekki* í development mode, þ.e.a.s. á local vél
// const ssl = nodeEnv !== 'development' ? { rejectUnauthorized: false } : false;

// const pool = new pg.Pool({ connectionString, ssl });
const pool = new pg.Pool({ connectionString });

pool.on('error', (err) => {
  console.error('Villa í tengingu við gagnagrunn, forrit hættir', err);
  process.exit(-1);
});

export async function query(_query, values = []) {
  const client = await pool.connect();

  try {
    const result = await client.query(_query, values);
    return result;
  } finally {
    client.release();
  }
}

// TODO rest af föllum
export async function listCount() {
  let result = [];

  try {
    const queryResult = await query('SELECT COUNT(*) AS count FROM signatures');
    if (queryResult && queryResult.rows) {
      result = queryResult.rows;
    }
  } catch (error) {
    console.error('Kann ekki að telja', error);
  }

  return result;
}

/**
 * Insert a single registration into the registration table.
 *
 * @param {string} entry.name – Name of registrant
 * @param {string} entry.nationalId – National ID of registrant
 * @param {string} entry.comment – Comment, if any from registrant
 * @param {boolean} entry.anonymous – If the registrants name should be displayed or not
 * @returns {Promise<boolean>} Promise, resolved as true if inserted, otherwise false
 */
// eslint-disable-next-line object-curly-newline
export async function insert({ name, nationalId, comment, anonymous } = {}) {
  let success = true;

  const q = `
    INSERT INTO signatures
      (name, nationalId, comment, anonymous)
    VALUES
      ($1, $2, $3, $4);
  `;
  const values = [name, nationalId, comment, anonymous === 'on'];

  try {
    await query(q, values);
  } catch (e) {
    console.error('Error inserting signature', e);
    success = false;
  }

  return success;
}

export async function deleteUser(id) {
  const client = await pool.connect();
  let result = [];

  try {
    const q = 'DELETE FROM signatures WHERE id=$1';
    const queryResult = client.query(q, [id]);
    result = queryResult;
  } catch (error) {
    console.error(error);
  }

  return result;
}

/**
 * List all registrations from the registration table.
 *
 * @returns {Promise<Array<list>>} Promise, resolved to array of all registrations.
 */
export async function list(offset, limit) {
  const client = await pool.connect();
  let result = [];

  try {
    const q =
      'SELECT id, name, nationalId, comment, anonymous, signed FROM signatures ORDER BY signed DESC OFFSET $1 LIMIT $2';
    const queryResult = await client.query(q, [offset, limit]);

    if (queryResult && queryResult.rows) {
      result = queryResult.rows;
    }
  } catch (e) {
    console.error('Error selecting signatures', e);
  }

  return result;
}

export async function getUsername() {
  let result = [];

  try {
    const queryResult = await query('SELECT username FROM users');
    if (queryResult && queryResult.rows) {
      result = queryResult.rows;
    }
  } catch (error) {
    console.error('Kann ekki að telja', error);
  }

  return result;
}

// Helper to remove pg from the event loop
export async function end() {
  await pool.end();
}
