import { pgEnum } from "drizzle-orm/pg-core";

// High-level user categories (for quick indexing)
export const userRoleEnum = pgEnum("UserRole", [
  "buyer",
  "seller",
  "agent",
  "agency_admin",
  "admin",
]);

// Property classifications
export const propertyTypeEnum = pgEnum("PropertyType", [
  "house",
  "apartment",
  "land",
  "commercial",
]);

export const propertyStatusEnum = pgEnum("PropertyStatus", [
  "draft",
  "active",
  "sold",
  "rented",
  "expired",
  "suspended",
]);

export const listingTypeEnum = pgEnum("ListingType", ["sale", "rent"]);

export const inquiryStatusEnum = pgEnum("InquiryStatus", [
  "new",
  "contacted",
  "scheduled",
  "closed",
]);
