import Link from "next/link";

export default function AdminBackHomeButton() {
  return (
    <div className="fixed left-4 top-4 z-50">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-4 py-2 text-sm font-extrabold text-black shadow-lg backdrop-blur hover:bg-white active:translate-y-px"
      >
        ← Back to Chat
      </Link>
    </div>
  );
}
