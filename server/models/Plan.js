const { Schema, model } = require("mongoose");

const planSchema = new Schema(
  {
    planId: { type: String, required: true, unique: true }, // client-generated UUID
    date: { type: String, required: true }, // YYYY-MM-DD
    userId: { type: String, required: true },
    task: { type: String, required: true },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    status: { type: String, enum: ["Pending", "Completed", "Skipped"], default: "Pending" },
    notes: { type: String, default: "" },
    completedAt: { type: String, default: "" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = model("Plan", planSchema);
