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

  server.on('error', (error) => {
    logger.warn({ error, port }, 'Healthcheck server error (non-fatal)');
  });
}
