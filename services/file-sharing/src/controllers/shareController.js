const { createShare, getShareByToken } = require("../services/shareService");
const { sendSuccess, sendError } = require("../utils/response");

const createShareToken = async (req, res) => {
    try {
        const { file_id, recipient_email } = req.body;

        if (!file_id || !recipient_email) {
            return sendError(res, "file_id and recipient_email are required", 400);
        }

        const shareData = await createShare({ file_id, recipient_email });

        return sendSuccess(
            res,
            "Share token generated",
            {
                token: shareData.token,
                file_id,
                expires_at: shareData.expires_at
            },
            201
        );
    } catch (error) {
        return sendError(res, "Failed to create share token", 500, [error.message]);
    }
};

const getShare = async (req, res) => {
    try {
        const { token } = req.params;
        const share = await getShareByToken(token);

        if (!share) {
            return sendError(res, "Share token not found", 404);
        }

        return sendSuccess(res, "Share found", {
            id: share._id,
            file_id: share.file_id,
            token: share.token,
            expires_at: share.expires_at,
            recipient_email: share.recipient_email
        });
    } catch (error) {
        return sendError(res, "Failed to get share", 500, [error.message]);
    }
};

module.exports = {
    createShareToken,
    getShare
};
