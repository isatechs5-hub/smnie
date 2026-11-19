import { drizzle as drizzleProxy } from 'drizzle-orm/pg-proxy';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import { hostzenProxyCallback, isHostzenConfigured } from './hostzen.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

function createDatabase() {
  if (isHostzenConfigured()) {
    return drizzleProxy(hostzenProxyCallback, { schema });
  }

  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      connectionString: process.env.DATABASE_URL || undefined,
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }

  return drizzleNodePg(global._postgresPool, { schema });
}

export const db = createDatabase();
