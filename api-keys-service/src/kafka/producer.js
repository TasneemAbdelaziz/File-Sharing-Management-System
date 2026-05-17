const { Kafka, logLevel } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'api-keys-service',
  brokers: [(process.env.KAFKA_BROKER || 'kafka:9092')],
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

const producer = kafka.producer();
let connected = false;

async function connect() {
  if (!connected) {
    await producer.connect();
    connected = true;
    console.log('[Kafka] Producer connected');
  }
}

async function publish(topic, message) {
  try {
    await connect();
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  } catch (err) {
    console.error(`[Kafka] Failed to publish to ${topic}:`, err.message);
  }
}

async function disconnect() {
  if (connected) {
    await producer.disconnect();
    connected = false;
  }
}

module.exports = { publish, disconnect };
