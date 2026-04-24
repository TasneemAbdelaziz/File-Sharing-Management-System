const mongoose = require("mongoose");

const DownloadAnalyticsRecordSchema = new mongoose.Schema(
    {
        fileId: { type: String, required: true },
        userId: { type: String, required: true },
        eventType: { type: String, required: true },
        billable: { type: Boolean, required: true },
        tracked: { type: Boolean, required: true },
        payload: { type: Object, required: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model("DownloadAnalyticsRecord", DownloadAnalyticsRecordSchema);
