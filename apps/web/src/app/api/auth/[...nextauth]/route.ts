/**
 * Auth.js v5 API route handler
 *
 * Handles all /api/auth/* routes (signin, signout, callback, session, etc.)
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
