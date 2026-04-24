const mongoose = require("mongoose");

const DownloadEventSchema = new mongoose.Schema(
    {
        fileId: { type: String, required: true },
        userId: { type: String, required: true },
        plan: {
            chunkCount: Number,
            estimatedSeconds: Number,
            serverHint: String
        },
        downloadedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

module.exports = mongoose.model("DownloadEvent", DownloadEventSchema);
