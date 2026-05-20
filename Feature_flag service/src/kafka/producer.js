const { Kafka, logLevel } = require('kafkajs');
const logger = require('../logger');
const { incrementKafkaPublished } = require('../metrics');

const clientId = process.env.KAFKA_CLIENT_ID || 'feature-flag-service';
const brokers = [(process.env.KAFKA_BROKER || 'kafka:9092')];
const topic = process.env.KAFKA_TOPIC || 'flag.updated';

const kafka = new Kafka({
  clientId,
  brokers,
  logLevel: logLevel.WARN
});

const producer = kafka.producer();
let producerReady = false;

async function connectProducer() {
  if (producerReady) {
    return;
  }

  try {
    await producer.connect();
    producerReady = true;
    logger.info('Kafka producer connected', { broker: brokers.join(',') });
  } catch (error) {
    producerReady = false;
    logger.warn('Kafka producer connection failed', { message: error.message });
    throw error;
  }
}

function isProducerReady() {
  return producerReady;
}

async function publishFlagUpdated(flag) {
  const payload = {
    service: flag.service,
    name: flag.name,
    enabled: flag.enabled,
    timestamp: new Date().toISOString()
  };

  try {
    await connectProducer();
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }]
    });
    incrementKafkaPublished(topic);
    logger.info('Published Kafka message', { topic, payload });
  } catch (error) {
    logger.warn('Kafka publish failed, continuing without blocking', {
      topic,
      message: error.message,
      payload
    });
  }
}

module.exports = {
  producer,
  connectProducer,
  publishFlagUpdated,
  isProducerReady
};
