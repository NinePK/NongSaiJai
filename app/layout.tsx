import "./globals.css";
import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <header className="topbar" role="banner">
          <div className="topbar__inner">
            <div className="topbar__left">
              <div className="topbar__brand">Nong Sai Jai</div>
            </div>

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
