import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/trackmate';

let isConnected = false;

export async function connectMongoDB(uri?: string): Promise<typeof mongoose> {
  const mongoUri = uri ?? process.env['MONGODB_URI'] ?? DEFAULT_URI;

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    isConnected = true;
    console.log(`🍃 [MongoDB] Connected to database: ${conn.connection.name} (${conn.connection.host}:${conn.connection.port})`);
    return conn;
  } catch (err) {
    console.error('❌ [MongoDB] Connection error:', err);
    throw err;
  }
}

export async function disconnectMongoDB(): Promise<void> {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🍃 [MongoDB] Disconnected.');
  }
}

export { mongoose };
