// app/k/demo/page.tsx
// This simulates a public "khatam page" that people will visit via your share link.
// Later, this will be dynamic (app/k/[slug]) and show real data from Supabase.
export default function DemoKhatamPage() {
  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-black/5 bg-white p-6">
        <h1 className="text-2xl font-semibold mb-1">Khatam: Example (Demo)</h1>
        <p className="text-muted mb-4">Read by: 30 Rabīʿ al-Awwal, 9:00pm (Europe/London)</p>

        {/* Progress bar (dummy for now) */}
        <div className="mb-3">
          <div className="h-3 w-full rounded-full bg-[rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-full" style={{ width: "45%", background: "linear-gradient(90deg, var(--gold), var(--emerald))" }} />
          </div>
          <div className="mt-2 text-sm text-muted">45% pledged • 20% completed</div>
        </div>

        <div className="flex gap-3">
          <a href="#" className="btn-primary">Pledge now</a>
          <a href="#" className="btn-secondary">Get QR</a>
        </div>
      </section>

      <section className="rounded-xl border border-black/5 bg-white p-6">
        <h2 className="text-lg font-semibold mb-2">About this khatam</h2>
        <p className="text-muted">
          Dedication from the creator will show here, with intentions and purpose.
          Pledgers will not need accounts, and their emails are never shared with the creator.
        </p>
      </section>
    </div>
  );
}