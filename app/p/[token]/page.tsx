// app/p/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Pledge = {
  id: string;
  display_name: string | null;
  message: string | null;
  status: "pledged" | "completed" | "cancelled";
  units_pledged: number;
  units_completed: number;
  created_at: string;
  juz_number: number | null;
  khatam: {
    id: string;
    title: string;
    type: "quran" | "custom_counter";
    unit_label: string | null;
    target_units: number | null;
    slug: string;
    read_by_at: string;
    tz: string;
  };
};

export default function ManagePledgePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [pledge, setPledge] = useState<Pledge | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Editable fields
  const [unitsCompleted, setUnitsCompleted] = useState<number>(0);
  const [status, setStatus] = useState<"pledged" | "completed" | "cancelled">("pledged");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/pledge/get?token=${encodeURIComponent(String(token))}`);
        const json = await res.json();
        if (!json.ok) {
          setErr(json.error || "Failed to load pledge");
          setPledge(null);
        } else {
          const p: Pledge = json.data;
          setPledge(p);
          setUnitsCompleted(p.units_completed ?? 0);
          setStatus(p.status);
        }
      } catch (e: any) {
        setErr(String(e?.message ?? e));
        setPledge(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function saveChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!pledge) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/pledge/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          status,
          units_completed: Number(unitsCompleted),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setResult(`❌ ${json.error || "Update failed"}`);
      } else {
        setResult("✅ Changes saved");
        // Refresh the page data
        const ref = await fetch(`/api/pledge/get?token=${encodeURIComponent(String(token))}`);
        const j2 = await ref.json();
        if (j2.ok) {
          setPledge(j2.data);
          setUnitsCompleted(j2.data.units_completed ?? 0);
          setStatus(j2.data.status);
        }
      }
    } catch (e: any) {
      setResult(`❌ ${String(e?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading pledge…</div>;
  }
  if (err) {
    return <div className="p-6 text-red-600">Error: {err}</div>;
  }
  if (!pledge) {
    return <div className="p-6">Pledge not found.</div>;
  }

  const deadline = new Date(pledge.khatam.read_by_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="p-6 space-y-6">
      <button className="btn-secondary" onClick={() => router.push(`/k/${pledge.khatam.slug}`)}>
        ← Back to khatam
      </button>

      <div className="rounded-xl border border-black/5 bg-white p-5">
        <h1 className="text-xl font-semibold mb-1">{pledge.khatam.title}</h1>
        <p className="text-muted">
          Read by {deadline} <span className="text-xs">(based on {pledge.khatam.tz})</span>
        </p>
        <p className="text-sm mt-2">
          {pledge.khatam.type === "quran"
            ? `Your pledge: Juz’ ${pledge.juz_number ?? "—"}`
            : `Your pledge: ${pledge.units_pledged} ${pledge.khatam.unit_label ?? "units"}`}
        </p>
      </div>

      <form onSubmit={saveChanges} className="rounded-xl border border-black/5 bg-white p-5 grid gap-4 max-w-xl">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Status</label>
          <select
            className="border rounded px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="pledged">Pledged</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {pledge.khatam.type === "custom_counter" && (
          <div className="grid gap-1">
            <label className="text-sm font-medium">
              Units completed (out of {pledge.units_pledged})
            </label>
            <input
              type="number"
              min={0}
              max={pledge.units_pledged}
              className="border rounded px-3 py-2"
              value={unitsCompleted}
              onChange={(e) => setUnitsCompleted(Number(e.target.value))}
            />
            <span className="text-xs text-muted">
              You pledged {pledge.units_pledged} {pledge.khatam.unit_label ?? "units"}.
            </span>
          </div>
        )}

        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>

        {result && <div className="text-sm">{result}</div>}
      </form>
    </div>
  );
}