import { db } from "@/infrastructure/db/client";
import { domainEvent, eventOutbox } from "@/infrastructure/db/schema";
type NotificationChannel = "in_app" | "email" | "push";

export type EmitDomainEventInput = {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
  channels?: NotificationChannel[];
};

export async function emitDomainEvent(input: EmitDomainEventInput) {
  const channels = input.channels ?? ["in_app"];

  return db.transaction(async (tx) => {
    const [createdEvent] = await tx
      .insert(domainEvent)
      .values({
        eventType: input.eventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payloadJson: input.payload ?? {},
      })
      .returning();

    if (!createdEvent) {
      throw new Error("Failed to create domain event");
    }

    if (channels.length > 0) {
      await tx.insert(eventOutbox).values(
        channels.map((channel) => ({
          eventId: createdEvent.id,
          channel,
        })),
      );
    }

    return createdEvent;
  });
}