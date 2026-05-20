import { StackClientApp } from "@stackframe/stack";

const stackProjectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;

if (!stackProjectId && process.env.NODE_ENV === "production") {
  throw new Error(
    "Missing NEXT_PUBLIC_STACK_PROJECT_ID. Set NEXT_PUBLIC_STACK_PROJECT_ID in your environment."
  );
}

if (!stackProjectId) {
  console.warn(
    "Stack Auth is not configured: NEXT_PUBLIC_STACK_PROJECT_ID is missing. Continuing in dev mode without Stack login."
  );
}

export const stackClientApp =
  stackProjectId
    ? new StackClientApp({
        projectId: stackProjectId,
        tokenStore: "nextjs-cookie",
      })
    : undefined;
