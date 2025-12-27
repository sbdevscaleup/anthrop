import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  jsonb,
  decimal,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  propertyTypeEnum,
  propertyStatusEnum,
  listingTypeEnum,
  inquiryStatusEnum,
} from "./enums";
import { user } from "./auth-schema";
// import { agency } from "./agencies";
import { aimags, districts, subdistricts } from "./address";
import { agency } from "./agencies";

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),

  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  agentId: text("agent_id").references(() => user.id, { onDelete: "set null" }),
  organizationId: text("organization_id").references(() => agency.id, {
    onDelete: "set null",
  }),

  propertyType: propertyTypeEnum("property_type").notNull(),
  listingType: listingTypeEnum("listing_type").notNull(),
  status: propertyStatusEnum("status").default("draft").notNull(),

  title: text("title").notNull(),
  description: text("description"),

  aimagId: uuid("aimag_id").references(() => aimags.id),
  districtId: uuid("district_id").references(() => districts.id),
  subdistrictId: uuid("subdistrict_id").references(() => subdistricts.id),

  price: bigint("price", { mode: "number" }),
  area: decimal("area", { precision: 10, scale: 2 }),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  floors: integer("floors"),
  yearBuilt: integer("year_built"),

  features: jsonb("features").default({}),
  images: jsonb("images").default([]),
  viewCount: integer("view_count").default(0),
  favoriteCount: integer("favorite_count").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

export const propertyFavorites = pgTable("property_favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const propertyInquiries = pgTable("property_inquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  inquirerId: text("inquirer_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  message: text("message"),
  contactEmail: text("contact_email"),
  status: inquiryStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const propertyRelations = relations(properties, ({ one, many }) => ({
  owner: one(user, { fields: [properties.ownerId], references: [user.id] }),
  agent: one(user, { fields: [properties.agentId], references: [user.id] }),
  agency: one(agency, {
    fields: [properties.organizationId],
    references: [agency.id],
  }),
  favorites: many(propertyFavorites),
  inquiries: many(propertyInquiries),
}));

// price: bigint("price", { mode: "number" }),
