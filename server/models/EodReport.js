const { Schema, model } = require("mongoose");

const eodReportSchema = new Schema(
  {
    reportId: { type: String, required: true, unique: true }, // client-generated UUID
    date: { type: String, required: true }, // YYYY-MM-DD
    userId: { type: String, required: true },
    summary: { type: String, default: "" },
    highlights: { type: String, default: "" },
    blockers: { type: String, default: "" },
    tasksPlanned: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    fileUrl: { type: String, default: "" },
    fileName: { type: String, default: "" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

module.exports = model("EodReport", eodReportSchema);
