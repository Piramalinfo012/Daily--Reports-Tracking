const { Schema, model } = require("mongoose");

const mdReportSchema = new Schema(
  {
    entryId: { type: String, required: true, unique: true }, // client-generated UUID
    timestamp: { type: String, required: true }, // ISO timestamp
    category: {
      type: String,
      enum: ["Completed", "Pending", "Nextday Priority"],
      default: "Pending",
    },
    workDescription: { type: String, default: "" },
    workingPerson: { type: String, default: "" },
    remarks: { type: String, default: "" },
    attachmentUrl: { type: String, default: "" },
    completedDate: { type: String, default: "" },
    completedFileUrl: { type: String, default: "" },
    completedRemark: { type: String, default: "" },
  },
  { timestamps: false }
);

module.exports = model("MdReport", mdReportSchema);
