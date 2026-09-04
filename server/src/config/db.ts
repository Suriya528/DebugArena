import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ENV } from './env.js';

let mongod: MongoMemoryServer | null = null;

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    let uri = ENV.MONGODB_URI;

    if (!uri) {
      console.log('⚡ No external MONGODB_URI specified. Starting MongoMemoryServer for standalone zero-config storage...');
      mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'debugarena'
        }
      });
      uri = mongod.getUri();
      console.log(`📦 Embedded MongoDB initialized at: ${uri}`);
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully.');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}
