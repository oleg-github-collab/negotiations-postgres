import { get, run } from './db.js';

const DAILY_TOKEN_LIMIT = Number(process.env.DAILY_TOKEN_LIMIT || 512000);

async function ensureUsageRow(day) {
  let row = await get('SELECT * FROM usage_daily WHERE day = $1', [day]);
  if (!row) {
    await run('INSERT INTO usage_daily(day, tokens_used) VALUES($1, 0)', [day]);
    row = await get('SELECT * FROM usage_daily WHERE day = $1', [day]);
  }
  return row;
}

export async function addTokensAndCheck(tokensToAdd) {
  const day = new Date().toISOString().slice(0, 10);
  const row = await ensureUsageRow(day);

  if (row.locked_until) {
    const until = new Date(row.locked_until).getTime();
    if (Date.now() < until) {
      throw new Error(`Ліміт досягнуто. Розблокування: ${row.locked_until}`);
    }
  }

  const newTotal = Number(row.tokens_used || 0) + Number(tokensToAdd || 0);

  if (newTotal >= DAILY_TOKEN_LIMIT) {
    const lock = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await run(
      'UPDATE usage_daily SET tokens_used = $1, locked_until = $2 WHERE day = $3',
      [newTotal, lock, day]
    );
    throw new Error(`Досягнуто денний ліміт токенів. Блокування до ${lock}`);
  }

  await run('UPDATE usage_daily SET tokens_used = $1 WHERE day = $2', [
    newTotal,
    day,
  ]);

  return newTotal;
}
