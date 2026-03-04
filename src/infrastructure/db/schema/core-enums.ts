import { pgEnum } from "drizzle-orm/pg-core";

export const adminL1TypeEnum = pgEnum("admin_l1_type", [
  "province",
  "capital_city",
]);

export const adminL2TypeEnum = pgEnum("admin_l2_type", ["district", "soum"]);

export const adminL3TypeEnum = pgEnum("admin_l3_type", ["khoroo", "bag"]);

export const propertyWorkflowStatusEnum = pgEnum("property_workflow_status", [
  "draft",
  "published",
  "closed",
  "archived",
]);

export const propertyPublishStateEnum = pgEnum("property_publish_state", [
  "private",
  "public",
]);

export const propertyLocationSourceEnum = pgEnum("property_location_source", [
  "pin",
  "manual",
]);

export const propertyLocationPrecisionEnum = pgEnum(
  "property_location_precision",
  ["point", "l2", "l3"],
);

export const mediaTypeEnum = pgEnum("property_media_type", [
  "image",
  "video",
  "document",
]);

export const mediaAccessLevelEnum = pgEnum("media_access_level", [
  "public",
  "private",
]);

export const uploadAssetStatusEnum = pgEnum("upload_asset_status", [
  "pending",
  "uploaded",
  "failed",
  "attached",
]);

export const roleAssignmentEnum = pgEnum("role_assignment", [
  "buyer",
  "seller",
  "renter",
  "agent",
  "agency_admin",
  "admin",
]);

export const outboxStatusEnum = pgEnum("outbox_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
  "push",
]);

export const rentalApplicationStatusEnum = pgEnum("rental_application_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "withdrawn",
]);

export const threadParticipantRoleEnum = pgEnum("thread_participant_role", [
  "owner",
  "agent",
  "inquirer",
  "admin",
]);

export const threadMessageTypeEnum = pgEnum("thread_message_type", [
  "text",
  "system",
]);

export const propertyAttributeValueTypeEnum = pgEnum(
  "property_attribute_value_type",
  ["number", "string", "boolean", "enum", "json"],
);

export const propertyAttributeScopeEnum = pgEnum("property_attribute_scope", [
  "global",
  "category",
  "subcategory",
]);
