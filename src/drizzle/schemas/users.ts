import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth-schema";
import { userRoleEnum } from "./enums";
// import { organization } from "./organizations";
import { properties, propertyFavorites, propertyInquiries } from "./properties";
import { agency } from "./agencies";
// import { agency } from "./agencies";

// 1️⃣ User extension table (profile info)
export const userProfile = pgTable("user_profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Basic details
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneVerified: boolean("phone_verified").default(false),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),

  // Professional / agency info
  position: text("position"),
  organizationId: text("organization_id").references(() => agency.id, {
    onDelete: "set null",
  }),

  // Metadata
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
  organization: one(agency, {
    fields: [userProfile.organizationId],
    references: [agency.id],
  }),
}));

// 2️⃣ Hybrid model for roles

// a. Quick lookup (enum)
export const userRole = pgTable("user_role", {
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  primaryRole: userRoleEnum("primary_role").default("buyer").notNull(),
});

// b. Multi-role mapping (flexible)
export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull(),
  organizationId: text("organization_id").references(() => agency.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  roles: many(userRoles),
  properties: many(properties),
  favorites: many(propertyFavorites),
  inquiries: many(propertyInquiries),
}));
