const { Kafka } = require("kafkajs");
const env = require("./env");

const kafka = new Kafka({
    clientId: env.serviceName,
    brokers: env.kafkaBrokers
});

const producer = kafka.producer();
let producerReady = false;

const connectKafkaProducer = async () => {
    if (process.env.NODE_ENV === "test") {
        producerReady = true;
        return;
    }

    await producer.connect();
    producerReady = true;
};

const publishEvent = async (topic, payload) => {
    if (!producerReady) {
        return;
    }

    await producer.send({
        topic,
        messages: [{ value: JSON.stringify(payload) }]
    });
};

const isProducerReady = () => producerReady;

module.exports = {
    connectKafkaProducer,
    publishEvent,
    isProducerReady
};
