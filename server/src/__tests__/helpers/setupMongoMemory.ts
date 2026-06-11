import { beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export function setupMongoMemory(): void {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    // Wait for index builds (incl. 2dsphere) so $near queries behave like production
    await Promise.all(Object.values(mongoose.connection.models).map((m) => m.init()));
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key]!.deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });
}
