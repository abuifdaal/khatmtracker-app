// app/api/pledge/create/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateToken, hashToken } from "../../../../lib/tokens";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

type Body = {
  slug: string;                // khatam slug
  display_name?: string;       // visible to creator
  message?: string;            // visible to creator (<= 250 chars)
  email?: string;              // PRIVATE (creator never sees this)
  units_pledged?: number;      // for custom_counter (>=1)
  juz_number?: number;         // for quran (1..30)
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // Basic validation
    if (!body.slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    if (body.message && body.message.length > 250)
      return NextResponse.json({ ok: false, error: "Message too long (max 250)" }, { status: 400 });

    // 1) Load khatam by slug
    const { data: khatam, error: kErr } = await supabase
      .from("khatams")
      .select("id, type")
      .eq("slug", body.slug)
      .single();

    if (kErr || !khatam) return NextResponse.json({ ok: false, error: "Khatam not found" }, { status: 404 });

    // 2) Enforce "read by" cutoff
    // Fetch read_by_at to enforce deadline
    const { data: kh, error: k2Err } = await supabase
      .from("khatams")
      .select("read_by_at")
      .eq("id", khatam.id)
      .single();
    if (k2Err || !kh) return NextResponse.json({ ok: false, error: "Khatam load error" }, { status: 500 });
    const now = new Date();
    if (now > new Date(kh.read_by_at)) {
      return NextResponse.json({ ok: false, error: "Pledging has closed for this khatam" }, { status: 400 });
    }

    // 3) Create manage token (id + secret)
    const secret = generateToken();
    const hash = await hashToken(secret);

    // We’ll build the row depending on type
    let pledgeInsert: any = {
      khatam_id: khatam.id,
      display_name: body.display_name?.toString().slice(0, 100) || null,
      message: body.message?.toString().slice(0, 250) || null,
      email: body.email?.toString().slice(0, 200) || null,
      edit_token_hash: hash,
      // units defaults
      units_pledged: 1,
      units_completed: 0,
      status: "pledged",
    };

    if (khatam.type === "custom_counter") {
      const units = Math.max(1, Number(body.units_pledged || 1));
      pledgeInsert.units_pledged = units;

      // Insert pledge
      const { data: pledge, error: pErr } = await supabase
        .from("pledges")
        .insert(pledgeInsert)
        .select("edit_token_id")
        .single();

      if (pErr || !pledge) {
        return NextResponse.json({ ok: false, error: pErr?.message || "Insert failed" }, { status: 500 });
      }

      // Manage token format = "<id>.<secret>"
      const manage = `${pledge.edit_token_id}.${secret}`;
      return NextResponse.json({ ok: true, manage });
    }

    // Qur'an mode: reserve a Juz’ (1..30, only if not taken)
    const juz = Number(body.juz_number);
    if (!juz || juz < 1 || juz > 30) {
      return NextResponse.json({ ok: false, error: "Please select a valid Juz’ (1..30)" }, { status: 400 });
    }

    // Reserve the slot (only if not already taken)
    const { data: item, error: updErr } = await supabase
      .from("khatam_items")
      .update({ is_taken: true })
      .eq("khatam_id", khatam.id)
      .eq("juz_number", juz)
      .eq("is_taken", false) // only take if still free
      .select("id")
      .single();

    if (updErr || !item) {
      return NextResponse.json({ ok: false, error: "This Juz’ is already taken. Please choose another." }, { status: 400 });
    }

    // Insert pledge linked to that Juz
    pledgeInsert.khatam_item_id = item.id;

    const { data: pledge2, error: p2Err } = await supabase
      .from("pledges")
      .insert(pledgeInsert)
      .select("edit_token_id")
      .single();

    if (p2Err || !pledge2) {
      // If insert fails, free the slot
      await supabase.from("khatam_items").update({ is_taken: false }).eq("id", item.id);
      return NextResponse.json({ ok: false, error: p2Err?.message || "Insert failed" }, { status: 500 });
    }

    const manage = `${pledge2.edit_token_id}.${secret}`;
    return NextResponse.json({ ok: true, manage });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}