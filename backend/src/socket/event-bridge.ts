import { env } from '../config/env.config';
import redis from '../config/redis.config';
import { ServerToClientEvents } from '../types/socket.types';
import logger from '../utils/logger.util';
import { getSocketIo } from './socket.handler';

type EventName = keyof ServerToClientEvents;
type EventPayload<E extends EventName> = Parameters<ServerToClientEvents[E]>[0];

const CHANNEL = `${env.REDIS_KEY_PREFIX}:${env.NODE_ENV}:socket-events`;
const BRIDGED_EVENTS: ReadonlySet<EventName> = new Set<EventName>(['draw:winner', 'points:awarded']);

const emitLocally = (event: EventName, payload: unknown): boolean => {
  const io = getSocketIo();
  if (!io) return false;
  (io.emit as (name: string, data: unknown) => boolean)(event, payload);
  return true;
};

export const emitSocketEvent = <E extends EventName>(event: E, payload: EventPayload<E>): void => {
  if (emitLocally(event, payload)) return;
  const client = redis.getRawClient();
  if (!client) return;
  client.publish(CHANNEL, JSON.stringify({ event, payload })).catch((error: Error) => {
    logger.warn(`Relais Socket.io indisponible, événement ${event} non diffusé : ${error.message}`);
  });
};

export const startSocketEventBridge = (): { stop: () => Promise<void> } => {
  const client = redis.getRawClient();
  if (!client) return { stop: async () => undefined };

  const subscriber = client.duplicate({ connectionName: 'blocklucky-socket-bridge' });
  subscriber.on('error', () => undefined);
  subscriber.on('message', (channel: string, message: string) => {
    if (channel !== CHANNEL) return;
    try {
      const { event, payload } = JSON.parse(message) as { event: EventName; payload: unknown };
      if (BRIDGED_EVENTS.has(event)) emitLocally(event, payload);
    } catch {
      logger.warn('Message de relais Socket.io illisible ignoré');
    }
  });
  subscriber.subscribe(CHANNEL).catch((error: Error) => {
    logger.warn(`Abonnement au relais Socket.io impossible : ${error.message}`);
  });

  return {
    stop: async () => {
      await subscriber.quit().catch(() => undefined);
    },
  };
};
