/**
 * Staff API gate.
 *
 * Client magic-link routes authenticate by unguessable `client_token` only.
 * When `STAFF_ACCESS_CODE` is set, staff routes require matching `x-staff-access`.
 * When unset (local PGlite or published before the secret is added), staff routes
 * are open so the office can keep working — bind STAFF_ACCESS_CODE for lock-down.
 */

export function staffUnauthorized(message?: string): Response {
  return Response.json(
    {
      error: "unauthorized",
      message:
        message ||
        "Staff access required. Enter the staff access code on the home screen.",
    },
    { status: 401, headers: { "cache-control": "private, no-store" } },
  );
}

export function requireStaffAccess(request: Request): true | Response {
  const expected = process.env.STAFF_ACCESS_CODE?.trim() ?? "";
  const provided =
    request.headers.get("x-staff-access")?.trim() ||
    request.headers.get("X-Staff-Access")?.trim() ||
    "";

  if (expected === "") return true;

  if (provided !== "" && provided === expected) return true;
  return staffUnauthorized();
}

export function staffCodeConfigured(): boolean {
  return Boolean(process.env.STAFF_ACCESS_CODE?.trim());
}

export function isLocalDb(): boolean {
  return !process.env.DATABASE_URL?.trim();
}
