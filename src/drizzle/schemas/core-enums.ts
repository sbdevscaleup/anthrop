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

export const roleAssignmentEnum = pgEnum("role_assignment", [
  "buyer",
  "seller",
  "agent",
  "agency_admin",
  "admin",
]);
