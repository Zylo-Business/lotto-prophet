import "server-only";

import { StackServerApp } from "@stackframe/stack";
import { stackClientApp } from "./client";

export const stackServerApp =
  stackClientApp !== undefined
    ? new StackServerApp({
        inheritsFrom: stackClientApp,
      })
    : undefined;
