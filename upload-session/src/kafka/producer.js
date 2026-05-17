const { Kafka, logLevel } = require('kafkajs');
const logger = require('../utils/logger');

const kafka = new Kafka({ // Initialize Kafka client
  clientId: process.env.KAFKA_CLIENT_ID || 'upload-session', // Identify the client connection
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','), // Array of Kafka broker addresses
  logLevel: logLevel.ERROR, // Only log errors from KafkaJS
  retry: {
    initialRetryTime: 300, // Initial backoff time
    retries: 8, // Max retry attempts for connection issues
  },
});

const producer = kafka.producer({ // Create a Kafka producer instance
  allowAutoTopicCreation: true, // Automatically create topics if they don't exist
  transactionTimeout: 30000, // Timeout for transactions
});

let isConnected = false; // Connection state tracker

const connect = async () => { // Function to connect to Kafka brokers
  if (!isConnected) { // Connect only if not already connected
    await producer.connect();
    isConnected = true;
    logger.info('Kafka producer connected'); // Log connection success
  }
};

const disconnect = async () => { // Function to gracefully disconnect from Kafka brokers
  if (isConnected) { // Disconnect only if connected
    await producer.disconnect();
    isConnected = false;
    logger.info('Kafka producer disconnected'); // Log disconnection
  }
};

/**
 * Publish a message to a Kafka topic
 * @param {string} topic
 * @param {object} payload
 * @param {string} [key] - Optional partition key
 */
const publish = async (topic, payload, key = null) => { // Function to publish a message
  try {
    await connect(); // Ensure producer is connected before sending
    const message = { // Construct the Kafka message
      value: JSON.stringify({ // Serialize payload to JSON string
        ...payload,
        _meta: { // Inject metadata for tracing
          service: 'upload-session',
          timestamp: new Date().toISOString(),
        },
      }),
    };
    if (key) message.key = String(key); // Assign partitioning key if provided

    await producer.send({ topic, messages: [message] }); // Send the message to the specified topic
    logger.info('Kafka message published', { topic, key }); // Log success
  } catch (err) {
    logger.error('Kafka publish failed', { topic, error: err.message }); // Log failure but do not crash
  }
};

module.exports = { publish, disconnect, connect };
