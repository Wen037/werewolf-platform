import { EventEmitter } from 'events';

export interface DomainEvent {
  eventName: string;
  occurredOn: Date;
  payload: Record<string, unknown>;
}

class EventBus {
  private emitter = new EventEmitter();

  subscribe(eventName: string, handler: (event: DomainEvent) => void): void {
    this.emitter.on(eventName, handler);
  }

  publish(event: DomainEvent): void {
    this.emitter.emit(event.eventName, event);
    console.log(`[EventBus] Published: ${event.eventName}`);
  }
}

export const eventBus = new EventBus();
