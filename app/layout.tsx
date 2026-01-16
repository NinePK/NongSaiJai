import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

export const metadata: Metadata = {
  title: "Nong Sai Jai Admin Demo",
};

const themeInitScript = `
(function () {
  try {
    var saved = localStorage.getItem("theme");
    var theme = saved || "dark";

    document.documentElement.dataset.theme = theme;

    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`;

function HomeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <header className="topbar" role="banner">
          <div className="topbar__inner">
            {/* LEFT */}
            <div className="topbar__left">
              {/* ✅ ปุ่มกลับหน้าหลัก */}
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

            {/* RIGHT */}
            <div className="topbar__right">
              <a href="#" className="topbar__action" aria-label="Re-login">
                Re-login
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="appShell">{children}</main>
      </body>
    </html>
  );
}
