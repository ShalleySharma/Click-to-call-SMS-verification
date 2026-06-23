import "./globals.css";
import Link from "next/link";


export const metadata = {
  title: "Click-to-Call Portal",
  description: "A premium click-to-call portal built with Next.js 15.",
};

export default function RootLayout({ children }) {
  const linkClass =
    "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition-all duration-200 hover:bg-white/10 hover:border-white/20";

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <header className="sticky top-0 z-50">
          <div className="mx-auto max-w-5xl px-4 pt-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 backdrop-blur px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-glow" />
                <div className="text-sm font-semibold tracking-wide text-slate-100">
                  CTC Portal
                </div>
              </div>

              <nav className="flex items-center gap-3">
                <Link href="/" className={linkClass}>
                  CTC
                </Link>
                <Link href="/sms-verification" className={linkClass}>
                  SMS Verification
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}




