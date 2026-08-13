const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    userId: { type: String, required: true, unique: true, trim: true }, // employee code / login ID
    password: { type: String, required: true },
    lastLogin: { type: String, default: "" },
    role: { type: String, enum: ["Admin", "Member"], default: "Member" },
    department: { type: String, default: "" },
    avatarColor: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    allowedPages: {
      type: [String],
      default: ["Dashboard", "Daily Tracker", "EOD Report", "MD Report", "Settings"],
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = model("User", userSchema);
