import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";
import { user } from "./auth-schema";

export const agency = pgTable("agency", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  website: text("website"),
  licenseNumber: text("license_number"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Membership linking user ↔ organization
export const agencyMember = pgTable("agency_member", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => agency.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(), // could map to agent, admin, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agencyInvitation = pgTable("agency_invitation", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => agency.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").default("member").notNull(),
  status: text("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});
