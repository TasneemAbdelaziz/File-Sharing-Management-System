const express = require("express");
const { isDbReady } = require("../config/db");
const { isProducerReady } = require("../config/kafka");
const { isConsumerReady } = require("../config/kafkaConsumer");
const { sendSuccess } = require("../utils/response");

const router = express.Router();

router.get("/health", (req, res) => {
    return sendSuccess(res, "Service healthy", { service: "download-orchestrator" });
});

router.get("/ready", (req, res) => {
    const ready = isDbReady() && isProducerReady() && isConsumerReady();
    const status = ready ? 200 : 503;

    return res.status(status).json({
        success: ready,
        message: ready ? "Service ready" : "Service not ready",
        data: {
            dbReady: isDbReady(),
            producerReady: isProducerReady(),
            consumerReady: isConsumerReady()
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
