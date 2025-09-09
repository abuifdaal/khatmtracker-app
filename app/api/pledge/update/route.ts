// app/api/pledge/update/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { compareToken, splitManageToken } from "../../../../lib/tokens";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

type Body =
  | { manage: string; action: "setUnitsCompleted"; units_completed: number }
  | { manage: string; action: "markCompleted" }
  | { manage: string; action: "withdraw" };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.manage) return NextResponse.json({ ok: false, error: "Missing manage token" }, { status: 400 });

    const mixed = splitManageToken(body.manage);
    if (!mixed) return NextResponse.json({ ok: false, error: "Bad manage token" }, { status: 400 });

    // 1) Find the pledge row by token ID
    const { data: pledge, error: pErr } = await supabase
      .from("pledges")
      .select("id, khatam_id, edit_token_hash, units_pledged, status")
      .eq("edit_token_id", mixed.id)
      .single();

    if (pErr || !pledge) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    // 2) Check secret matches the stored hash
    const ok = await compareToken(mixed.secret, pledge.edit_token_hash);
    if (!ok) return NextResponse.json({ ok: false, error: "Invalid manage token" }, { status: 403 });

    // 3) Enforce deadline
    const { data: kh, error: kErr } = await supabase
      .from("khatams")
      .select("read_by_at")
      .eq("id", pledge.khatam_id)
      .single();

    if (kErr || !kh) return NextResponse.json({ ok: false, error: "Khatam check failed" }, { status: 500 });
    if (new Date() > new Date(kh.read_by_at)) {
      return NextResponse.json({ ok: false, error: "This khatam is closed" }, { status: 400 });
    }

    // 4) Apply action
    if (body.action === "withdraw") {
      const { error } = await supabase.from("pledges").update({ status: "withdrawn" }).eq("id", pledge.id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "markCompleted") {
      const { error } = await supabase
        .from("pledges")
        .update({ status: "completed", units_completed: pledge.units_pledged })
        .eq("id", pledge.id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "setUnitsCompleted") {
      const n = Math.max(0, Math.min(Number((body as any).units_completed || 0), pledge.units_pledged));
      const { error } = await supabase.from("pledges").update({ units_completed: n }).eq("id", pledge.id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
