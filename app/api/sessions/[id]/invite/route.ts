import { clientFillUrl } from "@/lib/client-link";
import { requireStaffAccess } from "@/lib/staff-auth";
import { getSessionById, saveSession } from "@/lib/sessions";
import { isInviteBasicsComplete } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
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
  if (!isInviteBasicsComplete(existing)) {
    return Response.json(
      {
        error: "incomplete_basics",
        message: "CRT #, insured name, and email are required before sending the client link.",
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const session = await saveSession({
    ...existing,
    changeTypesLockedByStaff: existing.changeTypes.length > 0,
    clientLinkSentAt: existing.clientLinkSentAt || now,
    status:
      existing.status === "client_submitted" ||
      existing.status === "confirmation_sent" ||
      existing.status === "ready_to_issue"
        ? existing.status
        : "awaiting_client",
  });

  const origin = new URL(request.url).origin;
  const clientUrl = clientFillUrl(origin, session.clientToken);

  return Response.json(
    { session, clientUrl },
    { headers: { "cache-control": "private, no-store" } },
  );
}
