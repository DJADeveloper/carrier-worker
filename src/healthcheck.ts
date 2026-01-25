import http from 'http';
import { logger } from './logger';

export function startHealthcheckServer(port: number = 8080): void {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'carrier-worker' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, () => {
    logger.info({ port }, 'Healthcheck server started');
  });

  server.on('error', (err) => {
    logger.warn({ err, port }, 'Healthcheck server error (non-fatal, continuing)');
    // Don't throw - this is non-fatal, worker should continue
  });

  // Keep server reference to prevent garbage collection
  // This ensures the server stays alive
  (global as any).healthcheckServer = server;
}
