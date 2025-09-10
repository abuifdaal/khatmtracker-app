// app/api/khatam/pledges/route.ts
// Returns pledges for a khatam (by slug), WITHOUT emails.
//
// Query: /api/khatam/pledges?slug=<slug>
//
// Response shape:
// { ok: true, data: {
//     khatam: { id, slug, title, type, unit_label, target_units },
//     pledges: Array<{
//       id: string,
//       display_name: string | null,
//       message: string | null,
//       status: "pledged" | "completed" | "cancelled",
//       units_pledged: number,
//       units_completed: number,
//       created_at: string,
//       juz_number?: number | null
//     }>
//   }
// }
//
// NOTE: dev-only convenience until we add auth; emails are intentionally excluded.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug")?.trim();
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    }

    // Load khatam basic info
    const { data: khatam, error: kErr } = await supabase
      .from("khatams")
      .select("id, slug, title, type, unit_label, target_units")
      .eq("slug", slug)
      .single();

    if (kErr || !khatam) {
      return NextResponse.json({ ok: false, error: "Khatam not found" }, { status: 404 });
    }

    // Load pledges WITHOUT email. Include juz_number via related item.
    // (We explicitly list columns to avoid email being returned.)
    const { data: pledges, error: pErr } = await supabase
      .from("pledges")
      .select(`
        id,
        display_name,
        message,
        status,
        units_pledged,
        units_completed,
        created_at,
        khatam_item_id,
        khatam_items ( juz_number )
      `)
      .eq("khatam_id", khatam.id)
      .order("created_at", { ascending: false });

    if (pErr) {
      return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
    }

    // Map to a clean shape and flatten juz_number
    const cleaned = (pledges ?? []).map((p: any) => ({
      id: p.id,
      display_name: p.display_name ?? null,
      message: p.message ?? null,
      status: p.status,
      units_pledged: p.units_pledged ?? 0,
      units_completed: p.units_completed ?? 0,
      created_at: p.created_at,
      juz_number: p.khatam_items?.juz_number ?? null,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        khatam,
        pledges: cleaned,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}