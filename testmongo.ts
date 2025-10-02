import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;

// ✅ Throw an error if the env variable is missing
if (!uri) {
  throw new Error("MONGODB_URI is not defined in your .env file");
}

mongoose.connect(uri)
  .then(() => {
    console.log("Connected to MongoDB!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Connection error:", err);
    process.exit(1);
  });
