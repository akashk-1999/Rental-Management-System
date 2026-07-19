import mssql from 'mssql';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

let mssqlPool: mssql.ConnectionPool | null = null;
let dbError: string | null = null;

export function getDbError(): string | null {
  return dbError;
}

export function setDbError(err: string | null): void {
  dbError = err;
}

// Initialize the database client
export async function initDatabase(): Promise<void> {
  const server = process.env.DB_SERVER;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!server || !user || !password || !database) {
    const missingVars = [];
    if (!server) missingVars.push('DB_SERVER');
    if (!user) missingVars.push('DB_USER');
    if (!password) missingVars.push('DB_PASSWORD');
    if (!database) missingVars.push('DB_NAME');

    const errMsg = `[Database Setup Failed] Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file or platform Secrets.`;
    logger.error(errMsg);
    throw new Error(errMsg);
  }

  try {
    logger.info('[Database] Attempting to connect to Microsoft SQL Server...');
    const config: mssql.config = {
      server,
      user,
      password,
      database,
      port: parseInt(process.env.DB_PORT || '1433', 10),
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true, // Typical for local/dev servers
        enableArithAbort: true,
      },
      connectionTimeout: 5000, // 5-second timeout
    };

    mssqlPool = await new mssql.ConnectionPool(config).connect();
    logger.info('[Database] Connected to Microsoft SQL Server successfully.');
  } catch (err: any) {
    logger.error(`[Database Error] Failed to connect to SQL Server: ${err.message}`);
    throw new Error(`[Database Error] SQL Server Connection Failed: ${err.message}`);
  }
}

// Generic query executor returning rows
export async function query<T = any>(sql: string, params?: Record<string, any>): Promise<T[]> {
  if (!mssqlPool) {
    throw new Error('[Database Error] SQL Server pool not initialized. Call initDatabase first.');
  }

  const req = mssqlPool.request();
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      req.input(key, val);
    }
  }
  const result = await req.query(sql);
  return result.recordset as T[];
}

// Generic non-query executor (INSERT/UPDATE/DELETE/DDL)
export async function execute(sql: string, params?: Record<string, any>): Promise<{ rowsAffected: number }> {
  if (!mssqlPool) {
    throw new Error('[Database Error] SQL Server pool not initialized. Call initDatabase first.');
  }

  const req = mssqlPool.request();
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      req.input(key, val);
    }
  }
  const result = await req.query(sql);
  return {
    rowsAffected: result.rowsAffected[0] || 0,
  };
}

// Run a transaction with a generic callback
export async function transaction<T>(callback: (tx: mssql.Transaction) => Promise<T>): Promise<T> {
  if (!mssqlPool) {
    throw new Error('[Database Error] SQL Server pool not initialized. Call initDatabase first.');
  }

  const tx = new mssql.Transaction(mssqlPool);
  await tx.begin();
  try {
    const result = await callback(tx);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
