const app = require("./app");
const env = require("./config/env");
const { connectDb } = require("./config/db");
const { connectKafkaProducer } = require("./config/kafka");
const { connectAndRunConsumer } = require("./config/kafkaConsumer");

const start = async () => {
    await connectDb();
    await connectKafkaProducer();
    await connectAndRunConsumer();

    app.listen(env.port, () => {
        console.log(`download-orchestrator listening on port ${env.port}`);
    });
};

start().catch((error) => {
    console.error("Failed to start download-orchestrator", error);
    process.exit(1);
});
