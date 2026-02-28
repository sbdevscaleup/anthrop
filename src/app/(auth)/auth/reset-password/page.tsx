import React from "react";
import { Suspense } from "react";
import ResetPasswordClient from "./reset-password-client";

// Render a client-only component inside a Suspense boundary to avoid
// "useSearchParams() should be wrapped in a suspense boundary" build errors
// when prerendering the page under Next.js 16.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="my-6 px-4">Loading...</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
