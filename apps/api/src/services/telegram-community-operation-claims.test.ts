import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import {
  claimTelegramOperationWithStore,
  releaseTelegramOperationWithStore
} from './telegram-community-operation-claims.js';

test('an operation is claimed only once while its database claim is active', async () => {
  let exists = false;
  const store = {
    async updateMany() {
      return { count: 0 };
    },
    async create() {
      if (exists) {
        throw new Prisma.PrismaClientKnownRequestError('duplicate operation claim', {
          code: 'P2002',
          clientVersion: 'test'
        });
      }
      exists = true;
      return {};
    },
    async deleteMany() {
      return { count: 0 };
    }
  };

  const input = {
    operation: 'test-operation',
    key: 'same-side-effect',
    expiresAt: new Date(Date.now() + 60_000)
  };
  assert.equal(await claimTelegramOperationWithStore(store, input), true);
  assert.equal(await claimTelegramOperationWithStore(store, input), false);
});

test('a failed operation can release its claim for a safe retry', async () => {
  let deletedWhere: unknown;
  const store = {
    async updateMany() {
      return { count: 0 };
    },
    async create() {
      return {};
    },
    async deleteMany(args: { where: unknown }) {
      deletedWhere = args.where;
      return { count: 1 };
    }
  };

  await releaseTelegramOperationWithStore(store, {
    operation: 'send-reminder',
    key: 'event-1'
  });
  assert.deepEqual(deletedWhere, { bot: 'send-reminder', chatId: 'event-1' });
});
