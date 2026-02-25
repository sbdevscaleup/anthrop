import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  adminClient,
  organizationClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { auth } from "@/modules/auth/infrastructure/auth";
import { ac, admin, user } from "@/modules/auth/domain/permissions";

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
    phoneNumberClient(),
  ],
});
