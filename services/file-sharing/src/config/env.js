const dotenv = require("dotenv");

dotenv.config();

module.exports = {
    port: process.env.PORT || 3002,
    mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/file_sharing_db",
    kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    sharedTopic: process.env.SHARED_TOPIC || "file.shared",
    shareConsumerGroup: process.env.SHARE_CONSUMER_GROUP || "file-sharing-consumers",
    serviceName: "file-sharing"
};
