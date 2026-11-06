import {
  getSessionByToken,
  mergeClientSubmission,
  saveSession,
} from "@/lib/sessions";
import { toClientView, type EndorsementSession } from "@/lib/types";
import { isClientGateComplete } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token || token.length < 20) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const session = await getSessionByToken(token);
  if (!session) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return Response.json(
    { session: toClientView(session) },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token || token.length < 20) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const existing = await getSessionByToken(token);
  if (!existing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (
    existing.status === "confirmation_sent" ||
    existing.status === "ready_to_issue"
  ) {
    return Response.json(
      {
        error: "locked",
        message: "This request is already with our office for confirmation/issue.",
        session: toClientView(existing),
      },
      { status: 409 },
    );
  }

  const body = (await request.json()) as {
    session?: Partial<EndorsementSession>;
    submit?: boolean;
  };

  const merged = mergeClientSubmission(existing, body.session ?? {}, {
    submit: Boolean(body.submit),
  });

  if (body.submit && !isClientGateComplete(merged)) {
    return Response.json(
      {
        error: "incomplete",
        message: "Please complete all required items before submitting.",
        session: toClientView(merged),
      },
      { status: 400 },
    );
  }

  const session = await saveSession(merged);
  return Response.json(
    { session: toClientView(session) },
    { headers: { "cache-control": "private, no-store" } },
  );
}
