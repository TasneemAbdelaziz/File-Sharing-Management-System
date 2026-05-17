const { sendSuccess, sendError } = require("../utils/response");

const files = new Map([
    [
        "file-1",
        {
            fileId: "file-1",
            filename: "sample.txt",
            userId: "user-1",
            size: 1024
        }
    ]
]);

const createFile = async (req, res) => {
    try {
        const { filename, userId, size } = req.body;

        if (!filename || !userId || typeof size !== "number") {
            return sendError(res, "filename, userId and size are required", 400);
        }

        const fileId = `file-${files.size + 1}`;
        const record = { fileId, filename, userId, size };

        files.set(fileId, record);

        return sendSuccess(res, "File created", record, 201);
    } catch (error) {
        return sendError(res, "Failed to create file", 500, [error.message]);
    }
};

const getFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return sendError(res, "userId is required", 400);
        }

        const file = files.get(fileId);

        if (!file) {
            return sendError(res, "File not found", 404);
        }

        return sendSuccess(res, "File found", {
            fileId: file.fileId,
            filename: file.filename,
            size: file.size,
            ownerId: file.userId,
            requestedBy: userId
        });
    } catch (error) {
        return sendError(res, "Failed to get file", 500, [error.message]);
    }
};

module.exports = {
    createFile,
    getFile
};