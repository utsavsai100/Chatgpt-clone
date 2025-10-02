import dotenv from "dotenv";
dotenv.config(); // <-- loads .env or .env.local

import { v2 as cloudinary } from "cloudinary";

console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY);
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Test upload
const imageUrl =
  "https://cloudinary-marketing-res.cloudinary.com/image/upload/w_1000/landmannalaugar_iceland";

(async () => {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: "chat_uploads_test",
    });

    console.log("✅ Upload successful!");
    console.log("Secure URL:", result.secure_url);
    console.log("Public ID:", result.public_id);
  } catch (error) {
    console.error("❌ Upload failed:", error);
  }
})();
