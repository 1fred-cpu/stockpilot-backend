// kafka.helper.ts
import { ClientKafka } from '@nestjs/microservices';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class KafkaHelper {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async emitEvent(topic: string, key: string, event: string, data: any) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    await this.kafkaClient.emit(topic, {
      key,
      value: JSON.stringify(payload),
    });
  }
}
