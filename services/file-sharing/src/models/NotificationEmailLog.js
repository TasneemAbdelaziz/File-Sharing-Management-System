const mongoose = require("mongoose");

const NotificationEmailLogSchema = new mongoose.Schema(
    {
        recipient_email: { type: String, required: true },
        subject: { type: String, required: true },
        body: { type: String, required: true },
        status: { type: String, enum: ["SENT", "FAILED"], default: "SENT" },
        payload: { type: Object, required: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model("NotificationEmailLog", NotificationEmailLogSchema);
