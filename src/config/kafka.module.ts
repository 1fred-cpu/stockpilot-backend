import { Module } from '@nestjs/common';
import { KafkaHelper } from 'src/helpers/kafka.heper';
import { kafkaConfig } from './kafka.config';
import { ClientsModule } from '@nestjs/microservices';

@Module({
  imports: [ClientsModule.register(kafkaConfig)],
  providers: [KafkaHelper],
  exports: [KafkaHelper, ClientsModule],
})
export class KafkaModule {}
