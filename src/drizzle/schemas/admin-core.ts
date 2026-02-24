import {
  boolean,
  customType,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  adminL1TypeEnum,
  adminL2TypeEnum,
  adminL3TypeEnum,
} from "./core-enums";

const geometryMultiPolygon = customType<{ data: string }>({
  dataType() {
    return "geometry(MultiPolygon,4326)";
  },
});

const geometryPolygon = customType<{ data: string }>({
  dataType() {
    return "geometry(Polygon,4326)";
  },
});

export const adminL1 = pgTable(
  "admin_l1",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    nameMn: text("name_mn").notNull(),
    nameEn: text("name_en"),
    levelType: adminL1TypeEnum("level_type").notNull(),
    geom: geometryMultiPolygon("geom").notNull(),
    geomSimplified: geometryMultiPolygon("geom_simplified").notNull(),
    bbox: geometryPolygon("bbox").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("admin_l1_code_unique").on(table.code),
    index("admin_l1_level_type_idx").on(table.levelType),
  ],
);

export const adminL2 = pgTable(
  "admin_l2",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    l1Id: uuid("l1_id")
      .notNull()
      .references(() => adminL1.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    nameMn: text("name_mn").notNull(),
    nameEn: text("name_en"),
    levelType: adminL2TypeEnum("level_type").notNull(),
    geom: geometryMultiPolygon("geom").notNull(),
    geomSimplified: geometryMultiPolygon("geom_simplified").notNull(),
    bbox: geometryPolygon("bbox").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("admin_l2_parent_code_unique").on(table.l1Id, table.code),
    index("admin_l2_level_type_idx").on(table.levelType),
    index("admin_l2_l1_id_idx").on(table.l1Id),
  ],
);

export const adminL3 = pgTable(
  "admin_l3",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    l2Id: uuid("l2_id")
      .notNull()
      .references(() => adminL2.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    nameMn: text("name_mn").notNull(),
    nameEn: text("name_en"),
    levelType: adminL3TypeEnum("level_type").notNull(),
    geom: geometryMultiPolygon("geom").notNull(),
    geomSimplified: geometryMultiPolygon("geom_simplified").notNull(),
    bbox: geometryPolygon("bbox").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("admin_l3_parent_code_unique").on(table.l2Id, table.code),
    index("admin_l3_level_type_idx").on(table.levelType),
    index("admin_l3_l2_id_idx").on(table.l2Id),
  ],
);

export const boundaryDatasetVersion = pgTable(
  "boundary_dataset_version",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    version: text("version").notNull().unique(),
    checksum: text("checksum").notNull(),
    sourceMetaJson: text("source_meta_json"),
    importedAt: timestamp("imported_at").defaultNow().notNull(),
    isActive: boolean("is_active").default(false).notNull(),
  },
  (table) => [index("boundary_dataset_version_imported_at_idx").on(table.importedAt)],
);
