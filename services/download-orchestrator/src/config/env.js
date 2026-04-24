const dotenv = require("dotenv");

dotenv.config();

module.exports = {
    port: process.env.PORT || 3001,
    mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/download_orchestrator_db",
    kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    downloadedTopic: process.env.DOWNLOADED_TOPIC || "file.downloaded",
    downloadConsumerGroup: process.env.DOWNLOAD_CONSUMER_GROUP || "download-orchestrator-consumers",
    serviceName: "download-orchestrator"
};
