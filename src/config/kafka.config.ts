import { Transport, ClientsModuleOptions } from '@nestjs/microservices';

export const kafkaConfig: ClientsModuleOptions = [
  {
    name: 'KAFKA_SERVICE',
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'stockpilot-client',
        brokers: ['localhost:9092'], // change to your Kafka brokers
      },
      consumer: {
        groupId: 'inventory-service', // must be unique per service
      },
    },
  },
  {
    name: 'KAFKA_SERVICE',
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'stockpilot-client',
        brokers: ['localhost:9092'], // change to your Kafka brokers
      },
      consumer: {
        groupId: 'analytics-service', // must be unique per service
      },
    },
  },
];
