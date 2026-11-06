import { isLocalDb, staffCodeConfigured } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

/**
 * Public unlock probe — does not grant staff API access by itself.
 * Staff APIs still require x-staff-access matching STAFF_ACCESS_CODE.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const expected = process.env.STAFF_ACCESS_CODE?.trim() ?? "";
  const code = body.code?.trim() ?? "";

  if (expected === "") {
    return Response.json(
      {
        ok: false,
        error: "not_configured",
        message:
          "STAFF_ACCESS_CODE is not set. Add it in Cursor Secrets, then enter that same code here. Client magic links do not need this code.",
      },
      { status: 503 },
    );
  }

  if (code === "" || code !== expected) {
    return Response.json({ ok: false, error: "invalid_code" }, { status: 401 });
  }

  return Response.json({ ok: true, mode: "secured" });
}

export async function GET() {
  return Response.json({
    configured: staffCodeConfigured(),
    local: isLocalDb(),
  });
}
