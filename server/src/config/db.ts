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
      if (ENV.NODE_ENV === 'production') {
        throw new Error(
          '[FATAL] In-memory database (MongoMemoryServer) is strictly disabled in production. A persistent MONGODB_URI is required.'
        );
      }
      console.log('⚡ No external MONGODB_URI specified. Starting MongoMemoryServer for standalone zero-config storage...');
      mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'debugarena'
        }
      });
      uri = mongod.getUri();
      console.log(`📦 Embedded MongoDB initialized at: ${uri}`);
    }

    const options: mongoose.ConnectOptions = {
      dbName: 'debugarena',
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(uri, options);
    console.log('✅ Connected to MongoDB successfully (dbName: debugarena, maxPoolSize: 50).');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    if (ENV.NODE_ENV !== 'production' && !mongod) {
      console.log('⚠️ Remote MongoDB connection failed in development. Falling back to embedded MongoMemoryServer...');
      try {
        mongod = await MongoMemoryServer.create({
          instance: {
            dbName: 'debugarena'
          }
        });
        const fallbackUri = mongod.getUri();
        await mongoose.connect(fallbackUri, { dbName: 'debugarena' });
        console.log(`📦 Embedded MongoDB fallback initialized at: ${fallbackUri}`);
        return;
      } catch (fallbackErr) {
        console.error('❌ Embedded MongoDB fallback also failed:', fallbackErr);
      }
    }
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}
