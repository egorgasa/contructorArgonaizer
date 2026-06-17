import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Конструктор заявок на 3D-печать",
  description:
    "Опишите изделие через простой конструктор, и мы напечатаем его на нашем 3D-принтере.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="text-base font-semibold text-gray-900">
              3D-print<span className="text-brand-600">.studio</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/constructor"
                className="rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100"
              >
                Конструктор
              </Link>
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100"
              >
                Админка
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

        <footer className="mt-16 border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-gray-500">
            © {new Date().getFullYear()} 3D-print.studio — MVP
          </div>
        </footer>
      </body>
    </html>
  );
}
