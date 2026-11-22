import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "سودان-بريدج | SudanBridge - التسوق الدولي الميسر",
  description: "اطلب من أمازون، شي إن، علي إكسبريس ونون وادفع بالجنيه السوداني عبر بنكك.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
          <div className="container mx-auto px-4">
            <p>© {new Date().getFullYear()} سودان-بريدج (SudanBridge) — جميع الحقوق محفوظة</p>
            <p className="mt-1">مصمم للعمل بكفاءة على شبكات 2G/3G</p>
          </div>
        </footer>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {})); }`,
          }}
        />
      </body>
    </html>
  );
}
