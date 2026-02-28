import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";
import { property } from "./property-core";
import {
  notificationChannelEnum,
  outboxStatusEnum,
  rentalApplicationStatusEnum,
  threadMessageTypeEnum,
  threadParticipantRoleEnum,
} from "./core-enums";

export const domainEvent = pgTable(
  "domain_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    payloadJson: jsonb("payload_json").default({}).notNull(),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => [
    index("domain_event_aggregate_idx").on(table.aggregateType, table.aggregateId),
    index("domain_event_occurred_at_idx").on(table.occurredAt),
  ],
);

export const eventOutbox = pgTable(
  "event_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => domainEvent.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    status: outboxStatusEnum("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("event_outbox_status_idx").on(table.status),
    index("event_outbox_next_attempt_idx").on(table.nextAttemptAt),
    index("event_outbox_event_id_idx").on(table.eventId),
  ],
);

export const notification = pgTable(
  "notification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    dataJson: jsonb("data_json").default({}).notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_user_read_idx").on(table.userId, table.readAt),
    index("notification_created_at_idx").on(table.createdAt),
  ],
);

export const notificationPreference = pgTable(
  "notification_preference",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    inAppEnabled: boolean("in_app_enabled").default(true).notNull(),
    emailEnabled: boolean("email_enabled").default(true).notNull(),
    pushEnabled: boolean("push_enabled").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("notification_preference_user_event_uidx").on(
      table.userId,
      table.eventType,
    ),
  ],
);

export const rentalApplication = pgTable(
  "rental_application",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    applicantUserId: text("applicant_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: rentalApplicationStatusEnum("status").default("draft").notNull(),
    submittedAt: timestamp("submitted_at"),
    decidedAt: timestamp("decided_at"),
    decidedByUserId: text("decided_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("rental_application_property_status_idx").on(table.propertyId, table.status),
    index("rental_application_applicant_idx").on(table.applicantUserId),
    index("rental_application_decided_by_idx").on(table.decidedByUserId),
    // Prevent duplicate active applications for the same user and property.
    index("rental_application_active_unique_idx")
      .on(table.propertyId, table.applicantUserId)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.status} IN ('draft','submitted','under_review')`,
      ),
  ],
);

export const rentalApplicationSnapshot = pgTable(
  "rental_application_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rentalApplicationId: uuid("rental_application_id")
      .notNull()
      .references(() => rentalApplication.id, { onDelete: "cascade" }),
    submittedPayloadJson: jsonb("submitted_payload_json").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("rental_application_snapshot_app_idx").on(table.rentalApplicationId)],
);

export const rentalApplicationDocument = pgTable(
  "rental_application_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rentalApplicationId: uuid("rental_application_id")
      .notNull()
      .references(() => rentalApplication.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    metadataJson: jsonb("metadata_json").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("rental_application_document_app_idx").on(table.rentalApplicationId)],
);

export const propertyThread = pgTable(
  "property_thread",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    lastMessageAt: timestamp("last_message_at"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("property_thread_property_idx").on(table.propertyId),
    index("property_thread_last_message_idx").on(table.lastMessageAt),
  ],
);

export const threadParticipant = pgTable(
  "thread_participant",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => propertyThread.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: threadParticipantRoleEnum("role").default("inquirer").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    leftAt: timestamp("left_at"),
  },
  (table) => [primaryKey({ columns: [table.threadId, table.userId] }), index("thread_participant_user_idx").on(table.userId)],
);

export const threadMessage = pgTable(
  "thread_message",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => propertyThread.id, { onDelete: "cascade" }),
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    messageType: threadMessageTypeEnum("message_type").default("text").notNull(),
    body: text("body").notNull(),
    metadataJson: jsonb("metadata_json").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("thread_message_thread_created_idx").on(table.threadId, table.createdAt)],
);

export const messageReadState = pgTable(
  "message_read_state",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => propertyThread.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastReadMessageId: uuid("last_read_message_id").references(() => threadMessage.id, {
      onDelete: "set null",
    }),
    lastReadAt: timestamp("last_read_at"),
  },
  (table) => [primaryKey({ columns: [table.threadId, table.userId] }), index("message_read_state_user_idx").on(table.userId)],
);

export const aiSession = pgTable(
  "ai_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    consentGrantedAt: timestamp("consent_granted_at").notNull(),
    contextScope: text("context_scope").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("ai_session_user_idx").on(table.userId), index("ai_session_org_idx").on(table.organizationId)],
);

export const aiInteraction = pgTable(
  "ai_interaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => aiSession.id, { onDelete: "cascade" }),
    promptRedacted: text("prompt_redacted").notNull(),
    responseRedacted: text("response_redacted").notNull(),
    model: text("model").notNull(),
    tokenUsageJson: jsonb("token_usage_json").default({}).notNull(),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("ai_interaction_session_idx").on(table.sessionId)],
);

export const aiFeedback = pgTable(
  "ai_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    interactionId: uuid("interaction_id")
      .notNull()
      .references(() => aiInteraction.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    feedbackText: text("feedback_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("ai_feedback_interaction_idx").on(table.interactionId)],
);

export const aiRedactionAudit = pgTable(
  "ai_redaction_audit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    interactionId: uuid("interaction_id")
      .notNull()
      .references(() => aiInteraction.id, { onDelete: "cascade" }),
    redactionReportJson: jsonb("redaction_report_json").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("ai_redaction_audit_interaction_idx").on(table.interactionId)],
);

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, { fields: [notification.userId], references: [user.id] }),
  organization: one(organization, {
    fields: [notification.organizationId],
    references: [organization.id],
  }),
}));
