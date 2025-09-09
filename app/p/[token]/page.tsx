// app/p/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";

type Params = { token: string };

export default function ManagePledgePage({ params }: { params: Promise<Params> }) {
  const [token, setToken] = useState<string>("");
  const [unitsCompleted, setUnitsCompleted] = useState<number>(0);
  const [status, setStatus] = useState<string>("pledged");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    // Next.js 15: params is a Promise
    (async () => {
      const { token } = await params;
      setToken(token);
    })();
  }, [params]);

  async function call(action: "markCompleted" | "withdraw" | "setUnitsCompleted") {
    setMsg("");
    const body: any = { manage: token, action };
    if (action === "setUnitsCompleted") body.units_completed = unitsCompleted;
    const res = await fetch("/api/pledge/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.ok) setMsg("❌ " + json.error);
    else setMsg("✅ Saved");
  }

  return (
    <div className="rounded-xl border border-black/5 bg-white p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-2">Manage your pledge</h1>
      <p className="text-muted mb-4">
        Use this private page to update your progress. Keep this link safe.
      </p>

      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Units completed</span>
          <input
            type="number"
            className="border rounded px-3 py-2"
            value={unitsCompleted}
            onChange={(e) => setUnitsCompleted(Number(e.target.value))}
            min={0}
          />
          <button className="btn-secondary mt-2" onClick={() => call("setUnitsCompleted")}>
            Save progress
          </button>
        </label>

        <div className="flex gap-3">
          <button className="btn-primary" onClick={() => call("markCompleted")}>Mark completed</button>
          <button className="btn-secondary" onClick={() => call("withdraw")}>Withdraw pledge</button>
        </div>

        {msg && <div className="text-sm">{msg}</div>}
      </div>
    </div>
  );
}