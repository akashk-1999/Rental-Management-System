import app from './backend/app';
import { initDatabase, setDbError } from './backend/config/db';
import { initDatabaseSchema } from './backend/database/init';
import logger from './backend/utils/logger';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const PORT = parseInt(process.env.APP_PORT || '3000', 10);

async function bootstrap() {
  try {
    // 1. Initialize DB client (Enforces SQL Server, fails if not available)
    await initDatabase();

    // 2. Setup schema and default seeds
    await initDatabaseSchema();
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    setDbError(errorMsg);
    logger.error(`[Server Bootstrap Error] ${errorMsg}`);
    logger.warn('[Server Bootstrap] Starting Express in Database-Offline state. API endpoints requiring database will fail with 503.');
  }

  try {
    // 3. Integrate UI Bundler (Vite Middleware)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[Server] Mounting Vite developer middleware...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      logger.info('[Server] Serving production static files from dist/');
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    // 4. Start Server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`[Server] Server is running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
    });
  } catch (err: any) {
    logger.error(`[Server Hard Bootstrap Error] ${err.message}`);
    process.exit(1);
  }
}

bootstrap();
