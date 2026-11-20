// What people see when something fails is a plain sentence. The technical
// detail (Supabase codes, HTTP statuses, stack traces) goes to the console.

export const PLAIN = {
  save: "Couldn't save that. Try again in a moment.",
  load: "Couldn't load this right now. Try again in a moment.",
  remove: "Couldn't remove that. Try again in a moment.",
  network: "Couldn't reach Canary. Check your connection and try again.",
  session: "Your session has ended. Log in again to continue.",
} as const;

/** Logs the detail for debugging and hands back the plain message. */
export function reportError(where: string, detail: unknown, message: string): string {
  console.error(`[${where}]`, detail);
  return message;
}

/**
 * The message to show for a failed API call. Only the statuses listed in
 * `readable` pass the server's text through, for routes whose messages were
 * written for people (e.g. "Monthly briefing limit reached…"). Everything
 * else becomes `fallback`, with the server's text logged.
 */
export function apiErrorMessage(
  where: string,
  res: Response,
  json: { error?: unknown } | null,
  fallback: string,
  readable: number[] = []
): string {
  const serverText = typeof json?.error === "string" ? json.error : null;
  if (serverText && readable.includes(res.status)) return serverText;
  if (res.status === 401) return reportError(where, `${res.status} ${serverText ?? ""}`, PLAIN.session);
  return reportError(where, `${res.status} ${serverText ?? ""}`, fallback);
}
