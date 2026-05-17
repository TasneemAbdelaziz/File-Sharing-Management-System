const { Kafka } = require('kafkajs');

let producer;
//Initializes the connection with Apache Kafka, setting up a producer
//that will be used to send messages to the "quota.exceeded" topic
async function connectKafka() {
  const kafka = new Kafka({
    clientId: 'file-quota-service',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
  });

  producer = kafka.producer();
  try {
    await producer.connect();
    console.log('Connected to Kafka (Producer)');
  } catch (error) {
    console.error('Error connecting to Kafka:', error);
  }
}
//Sends a message to the "quota.exceeded" topic when a user tries to
//exceed their storage limit.
async function publishQuotaExceeded(userId, currentUsed, maxStorage, newFileSize) {
  if (!producer) return;
  
  try {
    await producer.send({
      topic: 'quota.exceeded',
      messages: [
        { 
          key: userId, 
          value: JSON.stringify({ 
            user_id: userId, 
            current_used: currentUsed, 
            max_storage: maxStorage, 
            attempted_file_size: newFileSize,
            timestamp: new Date().toISOString()
          }) 
        }
      ],
    });
    console.log(`Published quota.exceeded event for user ${userId}`);
  } catch (error) {
    console.error('Failed to publish message:', error);
  }
}

//Exporting the functions to be used in other parts of the application
module.exports = { connectKafka, publishQuotaExceeded };
