// lib/mongodb.ts
import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

// Initialize cache if not present
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };
if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectToDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = "mongodb+srv://utsavtiwari398_db_user:axGVbzV1P5WlBtjE@gptcluster.i5fabke.mongodb.net/";
    cached.promise = mongoose.connect(uri).then((mongooseInstance) => {
      console.log("✅ MongoDB Connected!");
      return mongooseInstance;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}