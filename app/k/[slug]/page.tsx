// app/k/[slug]/page.tsx
// Server component that fetches the khatam row and progress,
// then renders a simple page.

import { createClient } from "@supabase/supabase-js";

async function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, { auth: { persistSession: false } });
}

type Params = { slug: string };

export default async function KhatamPage({ params }: { params: Params }) {
  const supabase = await getSupabaseAnon();

  // 1) Load khatam by slug
  const { data: khatam, error: kErr } = await supabase
    .from("khatams")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (kErr || !khatam) {
    return (
      <div className="rounded-xl border border-black/5 bg-white p-6">
        <h1 className="text-xl font-semibold mb-2">Khatam not found</h1>
        <p className="text-muted">Please check the link.</p>
      </div>
    );
  }

  // 2) Get progress via our RPC (no PII)
  const { data: progress } = await supabase.rpc("khatam_progress_by_slug", { slug_in: params.slug });

  const deadline = new Date(khatam.read_by_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Simple progress numbers
  let label = "";
  let pct = 0;
  if (progress?.type === "quran") {
    const total = progress.total ?? 30;
    const pledged = progress.pledged ?? 0;
    const completed = progress.completed ?? 0;
    pct = Math.min(100, Math.round((pledged / total) * 100));
    label = `${pledged}/${total} pledged • ${completed}/${total} completed`;
  } else {
    const target = progress?.target_units ?? 0;
    const pledged = progress?.pledged_units ?? 0;
    const completed = progress?.completed_units ?? 0;
    pct = target > 0 ? Math.min(100, Math.round((pledged / target) * 100)) : 0;
    label = `${pledged}/${target} units pledged • ${completed}/${target} units completed`;
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-black/5 bg-white p-6">
        <h1 className="text-2xl font-semibold mb-1">{khatam.title}</h1>
        <p className="text-muted mb-4">
          Read by: {deadline} <span className="text-xs">(based on {khatam.tz})</span>
        </p>

        {/* Progress */}
        <div className="mb-3">
          <div className="h-3 w-full rounded-full bg-[rgba(0,0,0,0.08)] overflow-hidden">
            <div
              className="h-full"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--gold), var(--emerald))" }}
            />
          </div>
          <div className="mt-2 text-sm text-muted">{label}</div>
        </div>

        <div className="flex gap-3">
          <a className="btn-primary" href="#">Pledge (coming next)</a>
          <a className="btn-secondary" href="#">Get QR (coming next)</a>
        </div>
      </section>

      {khatam.dedication_text && (
        <section className="rounded-xl border border-black/5 bg-white p-6">
          <h2 className="text-lg font-semibold mb-2">Dedication</h2>
          <p className="text-muted whitespace-pre-wrap">{khatam.dedication_text}</p>
        </section>
      )}
    </div>
  );
}