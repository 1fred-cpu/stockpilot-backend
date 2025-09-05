import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventEmitterHelper {
  constructor(private eventEmitter: EventEmitter2) {}

  async emitEvent(topic: string, key: string, event: string, data: any) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    await this.eventEmitter.emit(topic, {
      key,
      value: payload,
    });
  }
}
