import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ENV } from './env.js';

let mongod: MongoMemoryServer | null = null;

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  let uri = ENV.MONGODB_URI;
  try {
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
    await reconcileDatabaseIndexes();
  } catch (error) {
    const maskedUri = (uri || '').replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.error(`❌ [FATAL] Failed to connect to MongoDB at: ${maskedUri}`);
    console.error('Diagnostic error details:', (error as Error).message);
    if ((error as Error).message?.includes('whitelist') || (error as Error).message?.includes('servers in your MongoDB Atlas cluster')) {
      console.error('👉 TIP: Render uses dynamic IP addresses. In MongoDB Atlas, go to "Network Access" -> "Add IP Address" -> click "Allow Access From Anywhere" (0.0.0.0/0).');
    }
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
        await reconcileDatabaseIndexes();
        return;
      } catch (fallbackErr) {
        console.error('❌ Embedded MongoDB fallback also failed:', fallbackErr);
      }
    }
    throw error;
  }
}

async function reconcileDatabaseIndexes(): Promise<void> {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const collections = await db.listCollections({ name: 'users' }).toArray();
    if (collections.length > 0) {
      const indexes = await db.collection('users').indexes();
      for (const idx of indexes) {
        // Drop legacy global unique username_1 index if it lacks partialFilterExpression
        if (idx.name === 'username_1' && idx.unique && !idx.partialFilterExpression) {
          console.log('🔄 Dropping legacy global unique index username_1 on users...');
          await db.collection('users').dropIndex('username_1');
          console.log('✅ Legacy global unique index username_1 dropped.');
        }
      }
    }

    const rpCollections = await db.listCollections({ name: 'roundprogresses' }).toArray();
    if (rpCollections.length > 0) {
      const indexes = await db.collection('roundprogresses').indexes();
      for (const idx of indexes) {
        if (idx.name === 'userId_1_roundNumber_1' && idx.unique && !idx.partialFilterExpression) {
          console.log('🔄 Dropping legacy unique index userId_1_roundNumber_1 on roundprogresses...');
          await db.collection('roundprogresses').dropIndex('userId_1_roundNumber_1');
          console.log('✅ Legacy index userId_1_roundNumber_1 dropped from roundprogresses.');
        }
      }
    }
  } catch (err: any) {
    // Non-critical: safe to ignore if already dropped
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}
