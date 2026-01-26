// app/admin/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Nong Sai Jai Admin",
};

function HomeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topbar" role="banner">
        <div className="topbar__inner">
          <div className="topbar__left">
            <Link
              href="/"
              className="topbar__home"
              aria-label="Back to Home"
              title="Back to Home"
            >
              <HomeIcon />
            </Link>

            <div className="topbar__brand">Nong Sai Jai</div>
          </div>
        </div>
      </header>

      <main className="appShell">{children}</main>
    </>
  );
}
