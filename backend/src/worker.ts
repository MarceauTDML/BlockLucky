import http from 'http';
import { env } from './config/env.config';
import { startWorkers, closeWorkers } from './workers';
import { registerShutdown } from './observability/shutdown';
import { startChainServices } from './blockchain/lottery.keeper';
import { metricsRegistry } from './observability/metrics';
import { isShuttingDown } from './observability/lifecycle';
import logger from './utils/logger.util';

const workers = startWorkers();
const chainServices = startChainServices();

if (workers.length === 0) {
  logger.error('Aucun worker démarré : Redis est requis pour le process worker');
  process.exit(1);
}

const probeServer = http.createServer((req, res) => {
  if (req.url === '/health/live') {
    const status = isShuttingDown() ? 503 : 200;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: status === 200 ? 'ok' : 'shutting_down' }));
    return;
  }
  if (req.url === '/metrics' && env.METRICS_ENABLED) {
    metricsRegistry
      .metrics()
      .then((body) => {
        res.writeHead(200, { 'Content-Type': metricsRegistry.contentType });
        res.end(body);
      })
      .catch(() => res.writeHead(500).end());
    return;
  }
  res.writeHead(404).end();
});

registerShutdown([
  { name: 'chain', close: async () => chainServices?.stop() },
  { name: 'workers', close: () => closeWorkers(workers) },
  {
    name: 'probe',
    close: () => new Promise<void>((resolve) => probeServer.close(() => resolve())),
  },
]);

const probePort = env.PORT + 1;
probeServer.listen(probePort, () => {
  logger.info(`${workers.length} worker(s) BullMQ démarré(s), sondes sur le port ${probePort}`);
});
