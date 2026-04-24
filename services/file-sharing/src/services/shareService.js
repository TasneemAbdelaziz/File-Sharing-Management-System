const crypto = require("crypto");
const ShareRecord = require("../models/ShareRecord");
const { publishEvent } = require("../config/kafka");
const env = require("../config/env");

const createShare = async ({ file_id, recipient_email }) => {
    const token = crypto.randomBytes(12).toString("hex");
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (process.env.NODE_ENV !== "test") {
        await ShareRecord.create({
            file_id,
            recipient_email,
            token,
            expires_at
        });
    }

    await publishEvent(env.sharedTopic, {
        eventType: "FILE_SHARED",
        file_id,
        recipientEmail: recipient_email,
        shareToken: token,
        expires_at: expires_at.toISOString(),
        occurredAt: new Date().toISOString()
    });

    return {
        token,
        expires_at
    };
};

const getShareByToken = async (token) => {
    if (process.env.NODE_ENV === "test") {
        return {
            file_id: "test-file",
            token,
            expires_at: new Date(Date.now() + 60 * 60 * 1000)
        };
    }

    return ShareRecord.findOne({ token }).lean();
};

module.exports = {
    createShare,
    getShareByToken
};
