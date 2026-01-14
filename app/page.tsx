import ChatWidget from "@/components/chat/ChatWidget";

const tiles = [
  "Dashboard",
  "Invoice to Cash\nTracker",
  "Proflex®",
  "Project\nManagement®",
  "Timesheet®",
  "MPsmarT",
  "Parking",
  "PMA",
  "Performance",
  "MDelivery",
  "Supplier\nEvaluate",
  "New\nFeatures",
];

export default function Page() {
  return (
    <main className="portal-theme portal-bg relative min-h-screen overflow-hidden">
      {/* Lighting layers (glow + dimmer) */}
      <div className="portal-lighting">
        <div className="portal-glow" />
        <div className="portal-dimmer" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full flex-col items-center justify-center px-6 py-16">
        {/* Header: responsive (stack on small) */}
        <div className="mb-10 grid w-full max-w-6xl grid-cols-1 items-center gap-6 md:grid-cols-3">
          <div className="text-sm font-semibold portal-text-main">
            ALWAYS
            <div className="text-2xl font-extrabold leading-tight">
              EXCEED
              <br />
              EXPECTATIONS
            </div>
          </div>

          <div className="text-center">
            <div className="text-5xl font-black tracking-tight portal-text-main">
              MSYNC
            </div>
            <div className="mt-1 text-xs font-semibold portal-text-muted">
              Internal Portal (Mock)
            </div>
          </div>

          <div className="text-left md:text-right text-sm font-semibold portal-text-main">
            <div>PASSION</div>
            <div>PROFESSIONAL</div>
            <div>TEAMWORK</div>
            <div>GIVER</div>
          </div>
        </div>

        {/* Tiles panel */}
        <div className="portal-panel w-full max-w-6xl p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {tiles.map((label) => (
              <div
                key={label}
                className="portal-tile flex h-28 items-center justify-center text-center text-sm font-extrabold"
              >
                <span className="whitespace-pre-line">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-sm font-semibold portal-text-muted">
          หากพบปัญหากรุณาติดต่อ{" "}
          <span className="portal-text-main">MFEC_NOC@MFEC.CO.TH</span>
        </div>
      </div>

      <ChatWidget />
    </main>
  );
}
