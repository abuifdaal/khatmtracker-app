// app/k/[slug]/page.tsx
"use client";

import Turnstile from "@/components/Turnstile";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function KhatamPage() {
  const { slug } = useParams<{ slug: string }>(); // ✅ get slug in a client component
  const [khatam, setKhatam] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [captchaToken, setCaptchaToken] = useState("");

  // Pledge form state
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [units, setUnits] = useState<number>(1);
  const [juz, setJuz] = useState<number>(1);
  const [result, setResult] = useState<{ ok: boolean; manage?: string; error?: string } | null>(null);

  // Load khatam + progress when slug is available
  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        const r1 = await fetch(`/api/khatam/get?slug=${encodeURIComponent(String(slug))}`);
        const j1 = await r1.json();
        const r2 = await fetch(`/api/progress/${encodeURIComponent(String(slug))}`);
        const j2 = await r2.json();
        setKhatam(j1.data || null);
        setProgress(j2.data || null);
      } catch (e) {
        console.error("load error", e);
        setKhatam(null);
        setProgress(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  async function submitPledge(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (!captchaToken) {
      setResult({ ok: false, error: "Please complete the CAPTCHA." });
      return;
    }

    const body: any = {
      slug: String(slug),
      display_name: displayName || undefined,
      message: message || undefined,
      email: email || undefined,
      captchaToken,
    };
    if (khatam?.type === "custom_counter") body.units_pledged = units;
    else body.juz_number = juz;

    try {
      const res = await fetch("/api/pledge/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setResult({ ok: false, error: String(err?.message ?? err) });
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-black/5 bg-white p-6">Loading…</div>;
  }

  if (!khatam) {
    return (
      <div className="rounded-xl border border-black/5 bg-white p-6">
        <h1 className="text-xl font-semibold mb-2">Khatam not found</h1>
        <p className="text-muted">Please check the link.</p>
      </div>
    );
  }

  // Progress labels (safe defaults)
  let pct = 0;
  let label = "";
  if (progress?.type === "quran") {
    const total = progress.total ?? 30;
    const pledged = progress.pledged ?? 0;
    const completed = progress.completed ?? 0;
    pct = total > 0 ? Math.min(100, Math.round((pledged / total) * 100)) : 0;
    label = `${pledged}/${total} pledged • ${completed}/${total} completed`;
  } else {
    const target = progress?.target_units ?? 0;
    const pledged = progress?.pledged_units ?? 0;
    const completed = progress?.completed_units ?? 0;
    pct = target > 0 ? Math.min(100, Math.round((pledged / target) * 100)) : 0;
    label = `${pledged}/${target} units pledged • ${completed}/${target} units completed`;
  }

  const deadline = new Date(khatam.read_by_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="grid gap-6">
      {/* Header / summary */}
      <section className="rounded-xl border border-black/5 bg-white p-6">
        <h1 className="text-2xl font-semibold mb-1">{khatam.title}</h1>
        <p className="text-muted mb-4">
          Read by: {deadline} <span className="text-xs">(based on {khatam.tz})</span>
        </p>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-3 w-full rounded-full bg-[rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--gold), var(--emerald))" }} />
          </div>
          <div className="mt-2 text-sm text-muted">{label}</div>
        </div>
      </section>

      {/* Pledge form */}
      <section className="rounded-xl border border-black/5 bg-white p-6">
        <h2 className="text-lg font-semibold mb-3">Pledge</h2>
        <form className="grid gap-3 max-w-xl" onSubmit={submitPledge}>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Name (optional)</span>
            <input className="border rounded px-3 py-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Message to the creator (optional, max 250)</span>
            <input className="border rounded px-3 py-2" value={message} maxLength={250} onChange={(e) => setMessage(e.target.value)} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Email (optional, private)</span>
            <input type="email" className="border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          {khatam.type === "custom_counter" ? (
            <label className="grid gap-1">
              <span className="text-sm font-medium">{khatam.unit_label} — units you’ll read</span>
              <input
                type="number"
                min={1}
                className="border rounded px-3 py-2"
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
              />
            </label>
          ) : (
            <label className="grid gap-1">
              <span className="text-sm font-medium">Select Juz’ (1–30)</span>
              <input
                type="number"
                min={1}
                max={30}
                className="border rounded px-3 py-2"
                value={juz}
                onChange={(e) => setJuz(Number(e.target.value))}
              />
              <span className="text-xs text-muted">We’ll show taken/available per Juz in a nicer UI later.</span>
            </label>
          )}

          {/* CAPTCHA */}
          <Turnstile onVerify={(token) => setCaptchaToken(token)} />

          <button className="btn-primary">Make Pledge</button>
        </form>

        {result && (
          <div className={`mt-3 rounded border p-3 ${result.ok ? "border-emerald" : "border-red-400"}`}>
            {result.ok ? (
              <div>
                <div className="mb-2">✅ Pledge created!</div>
                <div className="text-sm">
                  Your private manage link (keep this safe):{" "}
                  <a className="text-emerald underline" href={`/p/${result.manage}`}>/p/{result.manage}</a>
                </div>
                <div className="text-xs text-muted mt-1">
                  We’ll email this link to you if you enter an email.
                </div>
              </div>
            ) : (
              <div>❌ {result.error}</div>
            )}
          </div>
        )}
      </section>

      {!!khatam.dedication_text && (
        <section className="rounded-xl border border-black/5 bg-white p-6">
          <h2 className="text-lg font-semibold mb-2">Dedication</h2>
          <p className="text-muted whitespace-pre-wrap">{khatam.dedication_text}</p>
        </section>
      )}
    </div>
  );
}