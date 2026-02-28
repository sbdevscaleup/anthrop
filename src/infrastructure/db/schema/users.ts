import { relations } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";
import { userRoleEnum } from "./enums";
import { property, propertyFavorite, propertyInquiry } from "./property-core";

export const userProfile = pgTable("user_profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneVerified: boolean("phone_verified").default(false),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  position: text("position"),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "set null",
  }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const userRole = pgTable("user_role", {
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .primaryKey(),
  primaryRole: userRoleEnum("primary_role").default("buyer").notNull(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull(),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoleAssignment = pgTable("user_role_assignment", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "set null",
  }),
  role: userRoleEnum("role").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [userProfile.organizationId],
    references: [organization.id],
  }),
}));

export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, {
    fields: [userRole.userId],
    references: [user.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(user, {
    fields: [userRoles.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [userRoles.organizationId],
    references: [organization.id],
  }),
}));

export const userRoleAssignmentRelations = relations(
  userRoleAssignment,
  ({ one }) => ({
    user: one(user, {
      fields: [userRoleAssignment.userId],
      references: [user.id],
    }),
    organization: one(organization, {
      fields: [userRoleAssignment.organizationId],
      references: [organization.id],
    }),
  }),
);

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  primaryRole: one(userRole, {
    fields: [user.id],
    references: [userRole.userId],
  }),
  roles: many(userRoles),
  roleAssignments: many(userRoleAssignment),
  ownerProperties: many(property, { relationName: "property_owner" }),
  agentProperties: many(property, { relationName: "property_agent" }),
  favorites: many(propertyFavorite),
  inquiries: many(propertyInquiry),
}));
