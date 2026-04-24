const mongoose = require("mongoose");

const ShareRecordSchema = new mongoose.Schema(
    {
        file_id: { type: String, required: true },
        token: { type: String, required: true, unique: true, index: true },
        expires_at: { type: Date, required: true },
        recipient_email: { type: String, required: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model("ShareRecord", ShareRecordSchema);
