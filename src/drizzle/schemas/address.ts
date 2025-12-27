import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { properties } from "./properties";

export const aimags = pgTable("aimags", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  isCapital: boolean("is_capital").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const districts = pgTable("districts", {
  id: uuid("id").defaultRandom().primaryKey(),
  aimagId: uuid("aimag_id").notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subdistricts = pgTable("subdistricts", {
  id: uuid("id").defaultRandom().primaryKey(),
  districtId: uuid("district_id").notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aimagRelations = relations(aimags, ({ many }) => ({
  properties: many(properties),
}));
