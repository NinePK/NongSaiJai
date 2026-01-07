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
        <div className="topbar">
          <div className="topbar__inner">
            <div className="topbar__brand">Nong Sai Jai</div>

            {/* push right */}
            <div className="topbar__right">
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="appShell">{children}</div>
      </body>
    </html>
  );
}
