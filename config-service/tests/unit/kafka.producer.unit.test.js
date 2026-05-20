import { jest } from '@jest/globals';

const producerMock = {
  connect: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined)
};

const KafkaMock = jest.fn(() => ({ producer: jest.fn(() => producerMock) }));
const logLevel = { ERROR: 0 };

jest.unstable_mockModule('kafkajs', () => ({ Kafka: KafkaMock, logLevel }));
jest.unstable_mockModule('../../src/logger.js', () => ({ default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));
jest.unstable_mockModule('../../src/metrics.js', () => ({ kafkaMessagesPublishedTotal: { inc: jest.fn() } }));

const { kafkaProducer } = await import('../../src/kafka/producer.js');

describe('Kafka Producer', () => {
  test('initKafkaProducer connects kafka producer', async () => {
    await kafkaProducer.initKafkaProducer();
    expect(KafkaMock).toHaveBeenCalled();
    expect(producerMock.connect).toHaveBeenCalled();
    expect(kafkaProducer.isConnected()).toBe(true);
  });

  test('publishConfigUpdate sends message and increments metrics', async () => {
    const payload = { service: 'auth-service', key: 'MAX_CONNECTIONS', value: '100', timestamp: '2026-01-01T00:00:00.000Z' };
    await kafkaProducer.publishConfigUpdate(payload);
    expect(producerMock.send).toHaveBeenCalledWith({
      topic: expect.any(String),
      messages: [{ value: JSON.stringify(payload) }]
    });
  });
});
