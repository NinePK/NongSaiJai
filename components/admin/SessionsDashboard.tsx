"use client";

import { useMemo } from "react";

type KPI = {
  total: number;
  normal: number;
  concern: number;
  risk: number;
  high: number;
  mid: number;
  low: number;
};

function MiniBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 10, alignItems: "center" }}>
      <div style={{ color: "var(--muted)", fontWeight: 900 }}>{label}</div>
      <div style={{ height: 10, borderRadius: 999, border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%" }} />
      </div>
      <div style={{ textAlign: "right", fontWeight: 900 }}>{value}</div>
    </div>
  );
}

export function SessionsDashboard({ kpi }: { kpi: KPI }) {
  const total = kpi.total;

  const cards = useMemo(
    () => [
      { label: "โครงการทั้งหมด", value: kpi.total },
      { label: "มีความเสี่ยง", value: kpi.risk },
      { label: "ควรติดตาม", value: kpi.concern },
      { label: "ปกติ", value: kpi.normal },
    ],
    [kpi]
  );

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        background: "var(--card)",
        borderRadius: 14,
        padding: 16,
        boxShadow: "var(--shadow)",
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 12 }}>Dashboard</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              border: "1px solid var(--border)",
              background: "var(--card2)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ color: "var(--muted)", fontWeight: 900, fontSize: 12 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 950, marginTop: 6 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ border: "1px solid var(--border)", background: "var(--card2)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>สถานะภาพรวม</div>
          <MiniBar label="มีความเสี่ยง" value={kpi.risk} total={total} />
          <div style={{ height: 8 }} />
          <MiniBar label="ควรติดตาม" value={kpi.concern} total={total} />
          <div style={{ height: 8 }} />
          <MiniBar label="ปกติ" value={kpi.normal} total={total} />
        </div>

        <div style={{ border: "1px solid var(--border)", background: "var(--card2)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>ระดับความเสี่ยง</div>
          <MiniBar label="สูง" value={kpi.high} total={total} />
          <div style={{ height: 8 }} />
          <MiniBar label="กลาง" value={kpi.mid} total={total} />
          <div style={{ height: 8 }} />
          <MiniBar label="ต่ำ" value={kpi.low} total={total} />
        </div>
      </div>
    </div>
  );
}
