import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const entityAuditLog = pgTable(
  "entity_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("entity_audit_log_entity_idx").on(table.entityType, table.entityId),
    index("entity_audit_log_actor_idx").on(table.actorUserId),
    index("entity_audit_log_created_at_idx").on(table.createdAt),
  ],
);
