const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in server/.env");

  await mongoose.connect(uri, { dbName: "Dailydatabas" });
  isConnected = true;
  console.log("✅  MongoDB Atlas connected");
}

module.exports = connectDB;
