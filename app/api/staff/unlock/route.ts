import { isLocalDb, staffCodeConfigured } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const expected = process.env.STAFF_ACCESS_CODE?.trim() ?? "";
  const code = body.code?.trim() ?? "";

  if (expected === "") {
    return Response.json({
      ok: true,
      mode: isLocalDb() ? "local" : "open",
      warning: isLocalDb()
        ? undefined
        : "STAFF_ACCESS_CODE is not set yet — staff APIs are open until you add that secret.",
    });
  }

  if (code !== expected) {
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
