import { Kafka, logLevel } from 'kafkajs';
import dotenv from 'dotenv';
import logger from '../logger.js';
import { kafkaMessagesPublishedTotal } from '../metrics.js';

dotenv.config();

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
const clientId = process.env.KAFKA_CLIENT_ID || 'config-service';
const topic = process.env.KAFKA_TOPIC || 'config.updated';

let producer;
let connected = false;

function getKafka() {
  return new Kafka({
    clientId,
    brokers: [kafkaBroker],
    logLevel: logLevel.ERROR
  });
}

async function initKafkaProducer() {
  if (!producer) {
    const kafka = getKafka();
    producer = kafka.producer();
  }

  if (!connected) {
    try {
      await producer.connect();
      connected = true;
      logger.info('Kafka producer connected', { broker: kafkaBroker });
    } catch (error) {
      connected = false;
      logger.error('Kafka connection failed', { error: error.message });
      throw error;
    }
  }
}

async function publishConfigUpdate(payload) {
  if (!producer || !connected) {
    await initKafkaProducer().catch(() => {});
  }

  if (!producer || !connected) {
    return Promise.reject(new Error('Kafka producer unavailable'));
  }

  const result = await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }]
  });
  kafkaMessagesPublishedTotal.inc({ topic });
  logger.info('Kafka message published', { topic, payload });
  return result;
}

function isConnected() {
  return connected;
}

export const kafkaProducer = {
  initKafkaProducer,
  publishConfigUpdate,
  isConnected
};

export { initKafkaProducer };
