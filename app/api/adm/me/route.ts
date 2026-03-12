import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return Response.json({ ok: false, error: auth.message }, { status: 401 });
  return Response.json({ ok: true });
}
