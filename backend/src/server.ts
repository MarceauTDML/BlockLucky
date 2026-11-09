import http from 'http';
import app from './app';
import { env } from './config/env.config';
import { initSocketServer } from './socket/socket.handler';
import { startWorkers, closeWorkers } from './workers';
import { registerShutdown } from './observability/shutdown';
import logger from './utils/logger.util';

const httpServer = http.createServer(app);

httpServer.keepAliveTimeout = env.HTTP_KEEP_ALIVE_TIMEOUT_MS;
httpServer.headersTimeout = env.HTTP_KEEP_ALIVE_TIMEOUT_MS + 1000;
httpServer.requestTimeout = env.HTTP_REQUEST_TIMEOUT_MS;

const io = initSocketServer(httpServer);

const workers = env.RUN_WORKERS ? startWorkers() : [];

registerShutdown([
  {
    name: 'http',
    close: () =>
      new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
        httpServer.closeIdleConnections();
      }),
  },
  { name: 'socket.io', close: () => io.close() },
  { name: 'workers', close: () => closeWorkers(workers) },
]);

httpServer.listen(env.PORT, () => {
  logger.info(`Serveur BlockLucky démarré sur http://localhost:${env.PORT}`);
  logger.info(`Documentation Swagger disponible sur http://localhost:${env.PORT}/api/docs`);
  if (!env.RUN_WORKERS) {
    logger.info('Workers BullMQ désactivés dans ce process (RUN_WORKERS=false)');
  }
});

export default httpServer;
