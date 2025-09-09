// app/page.tsx
// This is the homepage people see at http://localhost:3000/
export default function HomePage() {
  return (
    <div className="grid gap-8">
      <section className="rounded-xl border border-black/5 bg-white p-6">
        <h1 className="text-2xl font-semibold mb-2">
          Organize a Khatam with ease
        </h1>
        <p className="text-muted mb-6">
          Create a Qur’an khatam or a custom counter (e.g., “Surah Yāsīn”, “Ṣalawāt (x1000)”).
          Share a link or QR code so people can pledge and update their status — no signup required.
        </p>

        <div className="flex flex-wrap gap-3">
          <a className="btn-primary" href="/create">Create Khatam</a>
          <a className="btn-secondary" href="/k/demo">See Demo Page</a>
        </div>
      </section>

      <section className="rounded-xl border border-black/5 bg-white p-6">
        <h2 className="text-lg font-semibold mb-2">Design direction</h2>
        <p className="text-muted">
          Minimal, mobile-first, inspired by the Green Dome palette.
          Clear progress bars, readable typography, and gentle gold accents.
        </p>
      </section>
    </div>
  );
}