// app/api/pledge/create/route.ts
// Creates a pledge for a khatam (Qur'an or custom counter).
// - Verifies Cloudflare Turnstile token server-side
// - For Qur'an: reserves a Juz' if available (1..30)
// - For custom counters: allows arbitrary units_pledged >= 1
// - Sends a private manage link by email (if email provided)
// - Creator will see only display_name + message; email stays private

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyTurnstile } from "../../../../lib/captcha";
import { sendManageLinkEmail } from "../../../../lib/email";
import { generateToken, hashToken } from "../../../../lib/tokens";

// Supabase service client (server-side)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

type Body = {
  slug: string;                // khatam slug
  display_name?: string;       // visible to creator (optional)
  message?: string;            // visible to creator (<= 250 chars, optional)
  email?: string;              // PRIVATE (optional)
  units_pledged?: number;      // for custom_counter (>=1)
  juz_number?: number;         // for quran (1..30)
  captchaToken?: string;       // Turnstile token
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // --- CAPTCHA ---
    const okCaptcha = await verifyTurnstile(body.captchaToken, undefined);
    if (!okCaptcha) {
      return NextResponse.json({ ok: false, error: "CAPTCHA failed. Please retry." }, { status: 400 });
    }

    // --- Validation ---
    if (!body.slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    if (body.message && body.message.length > 250) {
      return NextResponse.json({ ok: false, error: "Message too long (max 250)" }, { status: 400 });
    }

    // --- Load khatam ---
    const { data: khatam, error: kErr } = await supabase
      .from("khatams")
      .select("id, type, title, read_by_at")
      .eq("slug", body.slug)
      .single();

    if (kErr || !khatam) {
      return NextResponse.json({ ok: false, error: "Khatam not found" }, { status: 404 });
    }

    // --- Enforce deadline ---
    if (new Date() > new Date(khatam.read_by_at)) {
      return NextResponse.json({ ok: false, error: "Pledging has closed for this khatam" }, { status: 400 });
    }

    // --- Create manage token (private) ---
    const secret = generateToken();           // short random secret (e.g., 22 chars)
    const editHash = await hashToken(secret); // bcrypt hash stored server-side

    // Base pledge row fields
    let pledgeInsert: any = {
      khatam_id: khatam.id,
      display_name: body.display_name?.toString().slice(0, 100) || null,
      message: body.message?.toString().slice(0, 250) || null,
      email: body.email?.toString().slice(0, 200) || null, // stays private; never exposed via public view
      edit_token_hash: editHash,
      units_pledged: 1,
      units_completed: 0,
      status: "pledged",
    };

    // --- Branch: Custom counter khatam ---
    if (khatam.type === "custom_counter") {
      const units = Math.max(1, Number(body.units_pledged || 1));
      pledgeInsert.units_pledged = units;

      const { data: pledge, error: pErr } = await supabase
        .from("pledges")
        .insert(pledgeInsert)
        .select("edit_token_id")
        .single();

      if (pErr || !pledge) {
        return NextResponse.json({ ok: false, error: pErr?.message || "Insert failed" }, { status: 500 });
      }

      const manage = `${pledge.edit_token_id}.${secret}`;

      // Email the manage link (optional)
      if (body.email) {
        try {
          const base = process.env.APP_BASE_URL || "http://localhost:3000";
          const manageUrl = `${base}/p/${manage}`;
          await sendManageLinkEmail(body.email, manageUrl, khatam.title ?? "Your Khatam Pledge");
        } catch (e) {
          // Don't fail the request if email send fails
          console.warn("Email send failed:", e);
        }
      }

      return NextResponse.json({ ok: true, manage });
    }

    // --- Branch: Qur'an khatam (reserve a Juz') ---
    const juz = Number(body.juz_number);
    if (!juz || juz < 1 || juz > 30) {
      return NextResponse.json({ ok: false, error: "Please select a valid Juz’ (1..30)" }, { status: 400 });
    }

    // Reserve the Juz' only if it isn't taken
    // (atomic update ensures two users can't take the same Juz simultaneously)
    const { data: item, error: updErr } = await supabase
      .from("khatam_items")
      .update({ is_taken: true })
      .eq("khatam_id", khatam.id)
      .eq("juz_number", juz)
      .eq("is_taken", false)
      .select("id")
      .single();

    if (updErr || !item) {
      return NextResponse.json({ ok: false, error: "This Juz’ is already taken. Please choose another." }, { status: 400 });
    }

    // Insert pledge linked to that Juz'
    pledgeInsert.khatam_item_id = item.id;

    const { data: pledge2, error: p2Err } = await supabase
      .from("pledges")
      .insert(pledgeInsert)
      .select("edit_token_id")
      .single();

    if (p2Err || !pledge2) {
      // Free the slot if insert fails
      await supabase.from("khatam_items").update({ is_taken: false }).eq("id", item.id);
      return NextResponse.json({ ok: false, error: p2Err?.message || "Insert failed" }, { status: 500 });
    }

    const manage = `${pledge2.edit_token_id}.${secret}`;

    // Email the manage link (optional)
    if (body.email) {
      try {
        const base = process.env.APP_BASE_URL || "http://localhost:3000";
        const manageUrl = `${base}/p/${manage}`;
        await sendManageLinkEmail(body.email, manageUrl, khatam.title ?? "Your Khatam Pledge");
      } catch (e) {
        console.warn("Email send failed:", e);
      }
    }

    return NextResponse.json({ ok: true, manage });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}