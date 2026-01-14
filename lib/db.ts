import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function makePool() {
  const host = process.env.PGHOST;
  const port = Number(process.env.PGPORT || 5432);
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  if (!host) throw new Error("PGHOST missing");
  if (!user) throw new Error("PGUSER missing");
  if (!password) throw new Error("PGPASSWORD missing");
  if (!database) throw new Error("PGDATABASE missing");

  return new Pool({ host, port, user, password, database, max: 10, idleTimeoutMillis: 30_000 });
}

export const pool = global.__pgPool ?? makePool();

if (process.env.NODE_ENV !== "production") global.__pgPool = pool;
