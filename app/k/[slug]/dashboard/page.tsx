// app/k/[slug]/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/khatam/pledges?slug=${encodeURIComponent(String(slug))}`);
        const json = await res.json();
        if (!json.ok) {
          setError(json.error || "Unknown error");
          setData(null);
        } else {
          setData(json.data);
        }
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  function downloadCSV() {
    if (!data) return;
    const rows = [
      ["Name", "Message", "Status", "Units pledged", "Units completed", "Juz number", "Created at"],
      ...data.pledges.map((p: any) => [
        p.display_name || "",
        p.message || "",
        p.status,
        p.units_pledged,
        p.units_completed,
        p.juz_number || "",
        p.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${data.khatam.slug}-pledges.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return <div className="p-6">Loading dashboard…</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }
  if (!data) {
    return <div className="p-6">No data.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard for {data.khatam.title}</h1>
      <p className="text-muted">
        Type: {data.khatam.type} {data.khatam.unit_label ? `(${data.khatam.unit_label}, target ${data.khatam.target_units})` : ""}
      </p>

      <button className="btn-secondary" onClick={downloadCSV}>
        Download CSV
      </button>

      <div className="overflow-x-auto">
        <table className="w-full border border-black/10 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 border">Name</th>
              <th className="px-2 py-1 border">Message</th>
              <th className="px-2 py-1 border">Status</th>
              <th className="px-2 py-1 border">Units pledged</th>
              <th className="px-2 py-1 border">Units completed</th>
              <th className="px-2 py-1 border">Juz #</th>
              <th className="px-2 py-1 border">Created at</th>
            </tr>
          </thead>
          <tbody>
            {data.pledges.map((p: any) => (
              <tr key={p.id}>
                <td className="px-2 py-1 border">{p.display_name || "-"}</td>
                <td className="px-2 py-1 border">{p.message || "-"}</td>
                <td className="px-2 py-1 border">{p.status}</td>
                <td className="px-2 py-1 border">{p.units_pledged}</td>
                <td className="px-2 py-1 border">{p.units_completed}</td>
                <td className="px-2 py-1 border">{p.juz_number || "-"}</td>
                <td className="px-2 py-1 border">{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
