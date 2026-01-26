// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nong Sai Jai Admin ",
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
        {/* ✅ ไม่มี Navbar ที่ root แล้ว */}
        {children}
      </body>
    </html>
  );
}
