// lib/mongodb.ts
import mongoose from "mongoose";

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = "mongodb+srv://utsavtiwari398_db_user:axGVbzV1P5WlBtjE@gptcluster.i5fabke.mongodb.net/";
    cached.promise = mongoose.connect(uri).then((mongoose) => {
    console.log("✅ MongoDB Connected!");
      return mongoose;
    }
    );
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
