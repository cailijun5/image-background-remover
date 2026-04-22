export interface D1ResultRow {
  [key: string]: unknown;
}

interface CloudflareD1Response<T = D1ResultRow> {
  success: boolean;
  result: Array<{
    success: boolean;
    meta?: Record<string, unknown>;
    results?: T[];
  }>;
  errors?: Array<{ message?: string }>;
}

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 未配置`);
  }
  return value;
}

function getD1Endpoint() {
  const accountId = getEnv("CLOUDFLARE_ACCOUNT_ID");
  const databaseId = getEnv("CLOUDFLARE_DATABASE_ID");
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
}

export async function queryD1<T = D1ResultRow>(sql: string, params: unknown[] = []) {
  const apiToken = getEnv("CLOUDFLARE_API_TOKEN");
  const response = await fetch(getD1Endpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
    cache: "no-store",
  });

  const data = await response.json() as CloudflareD1Response<T>;
  if (!response.ok || !data.success || data.errors?.length) {
    throw new Error(data.errors?.[0]?.message || "D1 查询失败");
  }

  return data.result?.[0]?.results || [];
}

let schemaReady = false;

export async function ensurePaymentSchema() {
  if (schemaReady) return;

  const statements = [
    `CREATE TABLE IF NOT EXISTS payment_orders (
      order_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL,
      payer_id TEXT,
      capture_payload TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS user_plan_access (
      user_id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS credit_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      order_id TEXT,
      delta_credits INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger(user_id)`,
  ];

  for (const sql of statements) {
    await queryD1(sql);
  }

  schemaReady = true;
}
