import http from 'http';
import app from './app';
import { env } from './config/env.config';
import { initSocketServer } from './socket/socket.handler';
import { startEmailWorker } from './workers/email.worker';
import { startLedgerWorker } from './workers/ledger.worker';
import logger from './utils/logger.util';

const httpServer = http.createServer(app);

initSocketServer(httpServer);

startEmailWorker();
startLedgerWorker();

httpServer.listen(env.PORT, () => {
  logger.info(`Serveur BlockLucky démarré sur http://localhost:${env.PORT}`);
  logger.info(`Documentation Swagger disponible sur http://localhost:${env.PORT}/api/docs`);
});

export default httpServer;
