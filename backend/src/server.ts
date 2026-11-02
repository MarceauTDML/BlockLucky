import http from 'http';
import app from './app';
import { env } from './config/env.config';
import logger from './utils/logger.util';

const httpServer = http.createServer(app);

httpServer.listen(env.PORT, () => {
  logger.info(Serveur BlockLucky dÃ©marrÃ© sur http://localhost: + env.PORT);
});

export default httpServer;