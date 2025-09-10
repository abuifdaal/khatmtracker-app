// app/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import Turnstile from "@/components/Turnstile";

type KhatamType = "quran" | "custom_counter";

export default function CreateKhatamPage() {
  const [type, setType] = useState<KhatamType>("custom_counter");
  const [title, setTitle] = useState("");
  const [dedication, setDedication] = useState("");
  const [unitLabel, setUnitLabel] = useState("Surah Yasin");
  const [targetUnits, setTargetUnits] = useState<number>(40);
  const [readByLocal, setReadByLocal] = useState("");
  const [tz, setTz] = useState("Europe/London");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; slug?: string; error?: string } | null>(null);

  useEffect(() => {
    try {
      const autodetect = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (autodetect) setTz(autodetect);
    } catch {}
  }, []);

  function localToUTCISOString(local: string): string | null {
    if (!local) return null;
    const d = new Date(local);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    // CAPTCHA check
    if (!captchaToken) {
      setResult({ ok: false, error: "Please complete the CAPTCHA." });
      setLoading(false);
      return;
    }

    const readByISO = localToUTCISOString(readByLocal);
    if (!readByISO) {
      setResult({ ok: false, error: "Please choose a valid 'Read by' date/time." });
      setLoading(false);
      return;
    }

    const base: any = {
      type,
      title,
      dedication_text: dedication || undefined,
      readByISO,
      tz,
      captchaToken, // send token
    };

    if (type === "custom_counter") {
      base.unit_label = unitLabel;
      base.target_units = Number(targetUnits);
    }

    try {
      const res = await fetch("/api/khatam/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(base),
      });
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setResult({ ok: false, error: String(err?.message ?? err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/5 bg-white p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Create a Khatam</h1>
      <p className="text-muted mb-6">
        Choose Qur’an (30 Juz’) or a Custom Counter (e.g., “Surah Yāsīn”, “Ṣalawāt (x1000)”).
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Type toggle */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="type" value="custom_counter" checked={type === "custom_counter"} onChange={() => setType("custom_counter")} />
            <span>Custom Counter</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="type" value="quran" checked={type === "quran"} onChange={() => setType("quran")} />
            <span>Qur’an (30 Juz’)</span>
          </label>
        </div>

        {/* Title */}
        <label className="grid gap-1">
          <span className="text-sm font-medium">Title</span>
          <input className="border rounded px-3 py-2" placeholder='e.g. "Shawwal Khatam"' value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        </label>

        {/* Dedication */}
        <label className="grid gap-1">
          <span className="text-sm font-medium">Dedication (optional)</span>
          <textarea className="border rounded px-3 py-2" placeholder="Whom is this for? Intention/message." value={dedication} onChange={(e) => setDedication(e.target.value)} rows={3} />
        </label>

        {type === "custom_counter" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-medium">Unit label</span>
                <input className="border rounded px-3 py-2" placeholder='e.g. "Surah Yasin" or "Salawat (x1000)"' value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} required />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium">Target units</span>
                <input type="number" className="border rounded px-3 py-2" placeholder="e.g. 40" value={targetUnits} onChange={(e) => setTargetUnits(Number(e.target.value))} min={1} required />
              </label>
            </div>
            <p className="text-xs text-muted">In counter mode, people can pledge any number of “units”. Over-pledging is allowed until the deadline.</p>
          </>
        )}

        {/* Read-by */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Read by (your local time)</span>
            <input type="datetime-local" className="border rounded px-3 py-2" value={readByLocal} onChange={(e) => setReadByLocal(e.target.value)} required />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Your timezone</span>
            <input className="border rounded px-3 py-2" value={tz} onChange={(e) => setTz(e.target.value)} required />
          </label>
        </div>

        {/* CAPTCHA widget (only one instance, key forces remount) */}
        {typeof window !== "undefined" && (
          <Turnstile key="create-turnstile" onVerify={(token) => setCaptchaToken(token)} />
        )}

        <button className="btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Create Khatam"}
        </button>

        {result && (
          <div className={`rounded border p-3 ${result.ok ? "border-emerald" : "border-red-400"}`}>
            {result.ok ? (
              <div>
                <div className="mb-2">✅ Created!</div>
                <a className="btn-secondary" href={`/k/${result.slug}`}>Open your Khatam page</a>
              </div>
            ) : (
              <div>❌ {result.error}</div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}