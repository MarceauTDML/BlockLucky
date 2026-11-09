import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const runWithContext = <T>(context: RequestContext, callback: () => T): T =>
  storage.run(context, callback);

export const getRequestContext = (): RequestContext | undefined => storage.getStore();

export const setContextUserId = (userId: string): void => {
  const context = storage.getStore();
  if (context) context.userId = userId;
};
