import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { Server as SocketIoServer } from 'socket.io';

export type SocketScalingHandle = {
  enabled: boolean;
  close(): Promise<void>;
};

/**
 * Shares Socket.IO rooms and signals across API instances when SOCKET_REDIS_URL is configured.
 * An explicitly configured but unreachable Redis endpoint fails startup instead of silently
 * splitting callers and receivers across isolated instances.
 */
export async function configureSocketScaling(io: SocketIoServer): Promise<SocketScalingHandle> {
  const url = process.env.SOCKET_REDIS_URL?.trim();
  if (!url) return { enabled: false, close: async () => undefined };

  const publisher = createClient({ url });
  const subscriber = publisher.duplicate();
  publisher.on('error', (error) => console.error('[socket-scale] Redis publisher error', error));
  subscriber.on('error', (error) => console.error('[socket-scale] Redis subscriber error', error));

  try {
    await Promise.all([publisher.connect(), subscriber.connect()]);
    io.adapter(createAdapter(publisher, subscriber));
    console.info('[socket-scale] Redis adapter enabled.');
  } catch (error) {
    await Promise.allSettled([
      publisher.isOpen ? publisher.quit() : Promise.resolve(),
      subscriber.isOpen ? subscriber.quit() : Promise.resolve()
    ]);
    throw new Error('SOCKET_REDIS_URL is configured but the Socket.IO Redis adapter failed.', {
      cause: error
    });
  }

  return {
    enabled: true,
    close: async () => {
      await Promise.allSettled([
        publisher.isOpen ? publisher.quit() : Promise.resolve(),
        subscriber.isOpen ? subscriber.quit() : Promise.resolve()
      ]);
    }
  };
}
