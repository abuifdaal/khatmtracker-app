// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

// Basic metadata that shows in the browser tab
export const metadata: Metadata = {
  title: "khatmtracker",
  description: "Create and share Khatam campaigns (Qur’an & custom).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This is the outer HTML wrapper for all pages
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-ink antialiased">
        {/* Simple header with a wordmark */}
        <header className="border-b border-black/5 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <a href="/" className="font-semibold text-lg tracking-wide">
              <span className="text-emerald">khatm</span>
              <span className="text-gold">tracker</span>
            </a>

            {/* We’ll wire these links up later */}
            <nav className="text-sm text-muted flex gap-4">
              <a href="/create" className="hover:text-ink">Create Khatam</a>
              <a href="/dashboard" className="hover:text-ink">Dashboard</a>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-10">
          {children}
        </main>

        <footer className="mt-16 border-t border-black/5 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted">
            © {new Date().getFullYear()} khatmtracker — built for the ummah.
          </div>
        </footer>
      </body>
    </html>
  );
}