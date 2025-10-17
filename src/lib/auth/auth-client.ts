import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  adminClient,
  organizationClient,
} from "better-auth/client/plugins";
import { auth } from "./auth";
import { ac, admin, user } from "@/components/auth/permissions";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient({
      ac,
      roles: {
        admin,
        user,
      },
    }),
    organizationClient(),
  ],
});
