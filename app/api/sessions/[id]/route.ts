import { requireStaffAccess } from "@/lib/staff-auth";
import {
  deleteSession,
  getSessionById,
  saveSession,
} from "@/lib/sessions";
import type { EndorsementSession } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireStaffAccess(request);
  if (auth !== true) return auth;
  const { id } = await context.params;
  const session = await getSessionById(id);
  if (!session) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json(
    { session },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireStaffAccess(request);
  if (auth !== true) return auth;
  const { id } = await context.params;
  const existing = await getSessionById(id);
  if (!existing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const body = (await request.json()) as { session?: EndorsementSession };
  if (!body.session || body.session.id !== id) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const session = await saveSession({
    ...body.session,
    clientToken: existing.clientToken,
  });
  return Response.json(
    { session },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireStaffAccess(request);
  if (auth !== true) return auth;
  const { id } = await context.params;
  await deleteSession(id);
  return Response.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}
