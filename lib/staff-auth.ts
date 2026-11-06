/**
 * Staff API gate — fail closed.
 *
 * Client magic-link routes authenticate by unguessable `client_token` only
 * and do not use this helper.
 *
 * Staff list/create/update/delete/invite routes require `x-staff-access`
 * matching `STAFF_ACCESS_CODE`. If that secret is unset or blank, every
 * staff route is denied (no fail-open on a public app).
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
  if (expected === "") {
    return staffUnauthorized(
      "STAFF_ACCESS_CODE is not configured. Add that secret in Cursor, then unlock with the same code.",
    );
  }

  const provided =
    request.headers.get("x-staff-access")?.trim() ||
    request.headers.get("X-Staff-Access")?.trim() ||
    "";

  if (provided !== "" && provided === expected) return true;
  return staffUnauthorized();
}

export function staffCodeConfigured(): boolean {
  return Boolean(process.env.STAFF_ACCESS_CODE?.trim());
}

export function isLocalDb(): boolean {
  return !process.env.DATABASE_URL?.trim();
}
