const { createDownloadPlan } = require("../services/downloadService");
const { sendSuccess, sendError } = require("../utils/response");

const getDownloadPlan = async (req, res) => {
    try {
        const { file_id: fileId } = req.params;
        const userId = req.query.userId || "anonymous-user";

        const plan = await createDownloadPlan({ fileId, userId });

        return sendSuccess(res, "Download plan generated", { plan });
    } catch (error) {
        return sendError(res, "Failed to create download plan", 500, [error.message]);
    }
};

module.exports = {
    getDownloadPlan
};
