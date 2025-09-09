// app/api/khatam/create/route.ts
// Creates a khatam. For Qur'an, also seeds 30 Juz' items.
// Expects JSON body (see below). Returns { ok, slug } on success.

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";

// Small helper to generate a URL-friendly slug
function slugify(input: string) {
  const basic = input
    .toLowerCase()
    .replace(/[\s\_]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
  // Tiny random suffix to avoid collisions
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${basic}-${suffix}`.slice(0, 60); // keep it short
}

// Validate a plain object has required keys
function hasKeys<T extends object>(o: any, keys: (keyof T)[]): o is T {
  return !!o && typeof o === "object" && keys.every((k) => k in o);
}

// We’ll accept a “datetime-local” from the browser as ISO (UTC).
type CreateBody =
  | {
      type: "quran";
      title: string;
      dedication_text?: string;
      readByISO: string; // ISO string (UTC) from the browser
      tz: string;        // e.g. "Europe/London"
    }
  | {
      type: "custom_counter";
      title: string;
      dedication_text?: string;
      readByISO: string;
      tz: string;
      unit_label: string;  // e.g. "Surah Yasin" or "Salawat (x1000)"
      target_units: number; // e.g. 40 or 1000
    };

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.type || !["quran", "custom_counter"].includes(body.type)) {
      return NextResponse.json(
        { ok: false, error: "Invalid type. Must be 'quran' or 'custom_counter'." },
        { status: 400 }
      );
    }

    // Basic input checks (beginner-friendly)
    if (!body.title || typeof body.title !== "string" || body.title.trim().length < 3) {
      return NextResponse.json({ ok: false, error: "Title is required (min 3 chars)." }, { status: 400 });
    }
    if (!body.readByISO || !body.tz) {
      return NextResponse.json({ ok: false, error: "readByISO and tz are required." }, { status: 400 });
    }

    // Prepare data for insert
    const slug = slugify(body.title);
    const readByDate = new Date(body.readByISO); // already UTC ISO from the client
    if (isNaN(readByDate.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid readByISO date." }, { status: 400 });
    }

    // Build insert payload
    const baseInsert = {
      title: body.title.trim(),
      dedication_text: body.dedication_text?.toString().slice(0, 2000) ?? null,
      read_by_at: readByDate.toISOString(),
      tz: String(body.tz),
      slug,
      creator_user_id: null as string | null, // we’ll add auth later; for now can be null
    };

    let insertObj: any = baseInsert;
    if (body.type === "quran") {
      insertObj = { ...insertObj, type: "quran", unit_label: null, target_units: null };
    } else {
      // custom_counter
      if (!body.unit_label || !body.target_units || body.target_units <= 0) {
        return NextResponse.json(
          { ok: false, error: "unit_label and positive target_units are required for custom counters." },
          { status: 400 }
        );
      }
      insertObj = {
        ...insertObj,
        type: "custom_counter",
        unit_label: String(body.unit_label),
        target_units: Number(body.target_units),
      };
    }

    // Insert into DB (service role bypasses RLS safely on server)
    const { data: khatamRow, error: insertErr } = await supabaseServer
      .from("khatams")
      .insert(insertObj)
      .select("id, type, slug")
      .single();

    if (insertErr) {
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
    }

    // If Qur'an, seed 30 Juz' items
    if (khatamRow.type === "quran") {
      const { error: seedErr } = await supabaseServer.rpc("seed_quran_items", { khatam_uuid: khatamRow.id });
      if (seedErr) {
        return NextResponse.json({ ok: false, error: "Khatam created, but seeding failed: " + seedErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, slug: khatamRow.slug });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}