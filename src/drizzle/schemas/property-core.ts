import { relations } from "drizzle-orm";
import {
  bigint,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user, organization } from "./auth-schema";
import { listingTypeEnum, propertyTypeEnum, inquiryStatusEnum } from "./enums";
import {
  mediaTypeEnum,
  propertyLocationPrecisionEnum,
  propertyLocationSourceEnum,
  propertyPublishStateEnum,
  propertyWorkflowStatusEnum,
} from "./core-enums";
import { adminL1, adminL2, adminL3 } from "./admin-core";

const geographyPoint = customType<{ data: string }>({
  dataType() {
    return "geography(Point,4326)";
  },
});

export const property = pgTable(
  "property",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    agentUserId: text("agent_user_id").references(() => user.id, {
      onDelete: "set null",
    }),

    title: text("title").notNull(),
    description: text("description"),
    propertyType: propertyTypeEnum("property_type").notNull(),
    listingType: listingTypeEnum("listing_type").notNull(),
    workflowStatus: propertyWorkflowStatusEnum("workflow_status")
      .default("draft")
      .notNull(),
    publishState: propertyPublishStateEnum("publish_state")
      .default("private")
      .notNull(),

    priceMinor: bigint("price_minor", { mode: "number" }),
    currencyCode: text("currency_code").default("MNT"),
    areaM2: numeric("area_m2", { precision: 12, scale: 2 }),
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    floors: integer("floors"),
    yearBuilt: integer("year_built"),

    locationSource: propertyLocationSourceEnum("location_source")
      .default("manual")
      .notNull(),
    locationPrecision: propertyLocationPrecisionEnum("location_precision")
      .default("l2")
      .notNull(),
    locationPoint: geographyPoint("location_point"),
    l1Id: uuid("l1_id").references(() => adminL1.id, { onDelete: "set null" }),
    l2Id: uuid("l2_id").references(() => adminL2.id, { onDelete: "set null" }),
    l3Id: uuid("l3_id").references(() => adminL3.id, { onDelete: "set null" }),

    addressText: text("address_text"),
    featuresJson: jsonb("features_json").default({}).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    favoriteCount: integer("favorite_count").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    publishedAt: timestamp("published_at"),
    closedAt: timestamp("closed_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("property_l1_id_idx").on(table.l1Id),
    index("property_l2_id_idx").on(table.l2Id),
    index("property_l3_id_idx").on(table.l3Id),
    index("property_workflow_status_idx").on(table.workflowStatus),
    index("property_listing_type_idx").on(table.listingType),
    index("property_price_minor_idx").on(table.priceMinor),
    index("property_l2_status_listing_idx").on(
      table.l2Id,
      table.workflowStatus,
      table.listingType,
    ),
    index("property_l3_status_listing_idx").on(
      table.l3Id,
      table.workflowStatus,
      table.listingType,
    ),
  ],
);

export const propertyMedia = pgTable(
  "property_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    mediaType: mediaTypeEnum("media_type").default("image").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    metadataJson: jsonb("metadata_json").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("property_media_property_id_idx").on(table.propertyId),
    index("property_media_sort_order_idx").on(table.sortOrder),
  ],
);

export const propertyFavorite = pgTable(
  "property_favorite",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("property_favorite_property_id_idx").on(table.propertyId),
    index("property_favorite_user_id_idx").on(table.userId),
  ],
);

export const propertyInquiry = pgTable(
  "property_inquiry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    inquirerUserId: text("inquirer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    message: text("message"),
    contactEmail: text("contact_email"),
    status: inquiryStatusEnum("status").default("new").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("property_inquiry_property_id_idx").on(table.propertyId),
    index("property_inquiry_user_id_idx").on(table.inquirerUserId),
    index("property_inquiry_status_idx").on(table.status),
  ],
);

export const propertyRelationsV2 = relations(property, ({ one, many }) => ({
  owner: one(user, {
    relationName: "property_owner",
    fields: [property.ownerUserId],
    references: [user.id],
  }),
  agent: one(user, {
    relationName: "property_agent",
    fields: [property.agentUserId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [property.organizationId],
    references: [organization.id],
  }),
  l1: one(adminL1, {
    fields: [property.l1Id],
    references: [adminL1.id],
  }),
  l2: one(adminL2, {
    fields: [property.l2Id],
    references: [adminL2.id],
  }),
  l3: one(adminL3, {
    fields: [property.l3Id],
    references: [adminL3.id],
  }),
  media: many(propertyMedia),
  favorites: many(propertyFavorite),
  inquiries: many(propertyInquiry),
}));

export const propertyMediaRelations = relations(propertyMedia, ({ one }) => ({
  property: one(property, {
    fields: [propertyMedia.propertyId],
    references: [property.id],
  }),
}));

export const propertyFavoriteRelations = relations(propertyFavorite, ({ one }) => ({
  property: one(property, {
    fields: [propertyFavorite.propertyId],
    references: [property.id],
  }),
  user: one(user, {
    fields: [propertyFavorite.userId],
    references: [user.id],
  }),
}));

export const propertyInquiryRelations = relations(propertyInquiry, ({ one }) => ({
  property: one(property, {
    fields: [propertyInquiry.propertyId],
    references: [property.id],
  }),
  inquirer: one(user, {
    fields: [propertyInquiry.inquirerUserId],
    references: [user.id],
  }),
}));
