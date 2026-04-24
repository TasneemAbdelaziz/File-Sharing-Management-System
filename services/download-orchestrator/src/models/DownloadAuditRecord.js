const mongoose = require("mongoose");

const DownloadAuditRecordSchema = new mongoose.Schema(
    {
        topic: { type: String, required: true },
        eventType: { type: String, required: true },
        payload: { type: Object, required: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model("DownloadAuditRecord", DownloadAuditRecordSchema);
