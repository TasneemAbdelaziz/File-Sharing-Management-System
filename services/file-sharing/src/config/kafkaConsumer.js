const { Kafka } = require("kafkajs");
const env = require("./env");
const ShareAnalyticsLog = require("../models/ShareAnalyticsLog");
const NotificationEmailLog = require("../models/NotificationEmailLog");

const kafka = new Kafka({
    clientId: `${env.serviceName}-consumer`,
    brokers: env.kafkaBrokers
});

const consumer = kafka.consumer({ groupId: env.shareConsumerGroup });
let consumerReady = false;

const connectAndRunConsumer = async () => {
    if (process.env.NODE_ENV === "test") {
        consumerReady = true;
        return;
    }

    await consumer.connect();
    await consumer.subscribe({ topic: env.sharedTopic, fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            const payload = JSON.parse(message.value.toString());

            await ShareAnalyticsLog.create({
                topic,
                eventType: payload.eventType,
                payload
            });

            await NotificationEmailLog.create({
                recipient_email: payload.recipientEmail,
                subject: `Shared file ${payload.file_id}`,
                body: `A file was shared with token ${payload.shareToken}`,
                status: "SENT",
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
