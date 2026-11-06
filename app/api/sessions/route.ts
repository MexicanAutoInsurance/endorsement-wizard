import { requireStaffAccess } from "@/lib/staff-auth";
import { insertSession, listSessions } from "@/lib/sessions";
import { createSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireStaffAccess(request);
  if (auth !== true) return auth;
  const sessions = await listSessions();
  return Response.json(
    { sessions },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = requireStaffAccess(request);
  if (auth !== true) return auth;
  const session = await insertSession(createSession());
  return Response.json(
    { session },
    { status: 201, headers: { "cache-control": "private, no-store" } },
  );
}
