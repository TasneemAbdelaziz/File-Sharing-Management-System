const sendSuccess = (res, message, data = {}, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

const sendError = (res, message, statusCode = 500, errors = []) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    sendSuccess,
    sendError
};
