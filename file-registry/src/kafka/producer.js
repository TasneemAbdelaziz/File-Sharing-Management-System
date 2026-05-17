const { Kafka, logLevel } = require('kafkajs');
const logger = require('../utils/logger');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'file-registry',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
});

let isConnected = false;

const connect = async () => {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    logger.info('Kafka producer connected');
  }
};

const disconnect = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    logger.info('Kafka producer disconnected');
  }
};

/**
 * Publish a message to a Kafka topic
 * @param {string} topic
 * @param {object} payload
 * @param {string} [key] - Optional partition key
 */
const publish = async (topic, payload, key = null) => {
  try {
    await connect();
    const message = {
      value: JSON.stringify({
        ...payload,
        _meta: {
          service: 'file-registry',
          timestamp: new Date().toISOString(),
        },
      }),
    };
    if (key) message.key = String(key);

    await producer.send({ topic, messages: [message] });
    logger.info('Kafka message published', { topic, key });
  } catch (err) {
    // Non-fatal: log but do not crash the service
    logger.error('Kafka publish failed', { topic, error: err.message });
  }
};

module.exports = { publish, disconnect, connect };
