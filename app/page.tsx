import ChatShell from "@/components/chat/ChatShell";
import Link from "next/link";

export default function Page() {
  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 600px at 20% -10%, var(--bg-grad-1), transparent 55%), radial-gradient(900px 500px at 90% 10%, var(--bg-grad-2), transparent 60%), var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* soft background overlay (theme-aware) */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0" style={{ background: "transparent" }} />
      </div>

      {/* floating admin button */}
      <div className="fixed left-4 top-4 z-50">
        <Link
          href="/admin/sessions"
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-extrabold shadow-lg backdrop-blur hover:opacity-95 active:translate-y-px"
          style={{
            borderColor: "var(--border)",
            background: "var(--card)",
            color: "var(--text)",
          }}
        >
          Admin Sessions →
        </Link>
      </div>

      {/* content */}
      <div className="relative mx-auto max-w-3xl px-4 py-6">
        <ChatShell />
      </div>
    </main>
  );
}
