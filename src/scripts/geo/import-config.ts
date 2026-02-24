import path from "path";

export type ImportConfig = {
  files: {
    l1: string;
    l2: string;
    l3: string;
  };
  simplifyTolerance: {
    l1: number;
    l2: number;
    l3: number;
  };
  l3ParentCodeExceptions: Record<string, string>;
};

export const importConfig: ImportConfig = {
  files: {
    l1: path.resolve(process.cwd(), "src/admin-boundaries/admin_l1.geojson"),
    l2: path.resolve(process.cwd(), "src/admin-boundaries/admin_l2.geojson"),
    l3: path.resolve(process.cwd(), "src/admin-boundaries/admin_L3.geojson"),
  },
  simplifyTolerance: {
    l1: 0.005,
    l2: 0.0015,
    l3: 0.0006,
  },
  // These AU3 rows do not follow standard AU3[0:5] -> AU2 mapping.
  l3ParentCodeExceptions: {
    "222854": "02228",
    "441606": "04416",
    "441607": "04416",
    "441608": "04416",
    "441609": "04416",
    "441611": "04416",
    "0656551": "06555",
    "0656553": "06555",
    "0656555": "06555",
    "0656557": "06555",
    "0850051": "08555",
    "0850053": "08555",
    "0850055": "08555",
  },
};
