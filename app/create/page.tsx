// app/create/page.tsx
// This will become the "Create Khatam" form.
// For now, it’s just a placeholder so you can click around.
export default function CreateKhatamPage() {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-6">
      <h1 className="text-2xl font-semibold mb-2">Create a Khatam</h1>
      <p className="text-muted">
        In the next steps we’ll add a form to create:
        <br/>• Qur’an (30 Juz’, one per pledge)
        <br/>• Custom Counter (e.g., “Surah Yāsīn”, “Ṣalawāt (x1000)”)
      </p>
      <p className="mt-4 text-sm text-muted">
        We’ll connect this to the database (Supabase) and add CAPTCHA very soon.
      </p>
    </div>
  );
}