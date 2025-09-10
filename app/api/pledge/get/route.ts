// app/api/pledge/get/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

/**
 * GET /api/pledge/get?token=<edit_token_id>.<secret>
 * Returns pledge details (no email) for the pledger to view/manage.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token")?.trim();
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

    const [idPart, secret] = token.split(".");
    if (!idPart || !secret) {
      return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 });
    }

    // Load pledge by edit_token_id
    const { data: pledge, error: pErr } = await supabase
      .from("pledges")
      .select(`
        id,
        edit_token_id,
        edit_token_hash,
        display_name,
        message,
        status,
        units_pledged,
        units_completed,
        created_at,
        khatam_id,
        khatam_item_id,
        khatams (
          id,
          title,
          type,
          unit_label,
          target_units,
          slug,
          read_by_at,
          tz
        ),
        khatam_items (
          id,
          juz_number
        )
      `)
      .eq("edit_token_id", idPart)
      .single();

    if (pErr || !pledge) {
      return NextResponse.json({ ok: false, error: "Pledge not found" }, { status: 404 });
    }

    // Verify secret against hash
    const ok = await bcrypt.compare(secret, pledge.edit_token_hash);
    if (!ok) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 403 });

    // Build safe response (no email exposed)
    const resp = {
      id: pledge.id,
      display_name: pledge.display_name,
      message: pledge.message,
      status: pledge.status, // "pledged" | "completed" | "cancelled"
      units_pledged: pledge.units_pledged,
      units_completed: pledge.units_completed,
      created_at: pledge.created_at,
      juz_number: pledge.khatam_items?.juz_number ?? null,
      khatam: {
        id: pledge.khatams.id,
        title: pledge.khatams.title,
        type: pledge.khatams.type,
        unit_label: pledge.khatams.unit_label,
        target_units: pledge.khatams.target_units,
        slug: pledge.khatams.slug,
        read_by_at: pledge.khatams.read_by_at,
        tz: pledge.khatams.tz,
      },
    };

    return NextResponse.json({ ok: true, data: resp });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}