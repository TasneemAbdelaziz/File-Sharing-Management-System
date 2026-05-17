const { Kafka } = require("kafkajs");
const env = require("./env");
const DownloadAnalyticsRecord = require("../models/DownloadAnalyticsRecord");
const DownloadAuditRecord = require("../models/DownloadAuditRecord");

const kafka = new Kafka({
    clientId: `${env.serviceName}-consumer`,
    brokers: env.kafkaBrokers
});

const consumer = kafka.consumer({ groupId: env.downloadConsumerGroup });
let consumerReady = false;

const connectAndRunConsumer = async () => {
    if (process.env.NODE_ENV === "test") {
        consumerReady = true;
        return;
    }

    await consumer.connect();
    await consumer.subscribe({ topic: env.downloadedTopic, fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            const payload = JSON.parse(message.value.toString());

            await DownloadAnalyticsRecord.create({
                fileId: payload.fileId,
                userId: payload.userId,
                eventType: payload.eventType,
                billable: Boolean(payload.billable),
                tracked: Boolean(payload.tracked),
                payload
            });

            await DownloadAuditRecord.create({
                topic,
                eventType: payload.eventType,
                payload
            });
        }
    });

    consumerReady = true;
};

const isConsumerReady = () => consumerReady;

module.exports = {
    connectAndRunConsumer,
    isConsumerReady
};
