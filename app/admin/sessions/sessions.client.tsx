"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { LegendDialog } from "./LegendDialog";
import { Filters } from "./Filters";
import { SessionsTable, type SessionRow } from "./SessionsTable";

import styles from "./sessions.module.css";
export type KPI = {
  total: number;
  normal: number;
  concern: number;
  risk: number;
};
const BRAND = {
  blue1: "#0231b0",
  blue2: "#042f81",
  cyan: "#449ddf",
  purple: "#6966b0",
};
const GlowBg = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div
      className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
      style={{
        background:
          "radial-gradient(circle at 30% 30%, rgba(68,157,223,0.35), transparent 55%), radial-gradient(circle at 70% 40%, rgba(2,49,176,0.25), transparent 60%)",
      }}
    />
  </div>
);

const MetricCard = ({
  title,
  value,
  hint,
  accent = "blue",
}: {
  title: string;
  value: string;
  hint?: string;
  accent?: "blue" | "cyan" | "red" | "amber";
}) => {
  const gradients = {
    blue: "from-[rgba(2,49,176,0.18)]",
    cyan: "from-[rgba(68,157,223,0.20)]",
    red: "from-[rgba(220,38,38,0.14)]",
    amber: "from-[rgba(245,158,11,0.14)]",
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[accent]} to-transparent`} />
      <CardHeader className="relative pb-2">
        <CardDescription className="text-xs font-semibold">{title}</CardDescription>
        <CardTitle className="text-3xl font-black">{value}</CardTitle>
        {hint && <div className="text-xs text-muted-foreground pt-2">{hint}</div>}
      </CardHeader>
    </Card>
  );
};
export default function AdminSessionsClient({
  sessions,
  nextCursor,
  kpi,
  initialQuery,
  initialStatus,
}: {
  sessions: SessionRow[];
  nextCursor: string | null;
  kpi: KPI | null;
  initialQuery: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus || "ALL");

  const [rows, setRows] = useState<SessionRow[]>(sessions);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  const [legendOpen, setLegendOpen] = useState(false);
  const kpiView = useMemo(() => {
    if (kpi) return kpi;
    return {
      total: rows.length,
      risk: rows.filter((r) => r.effective_status === "RISK").length,
      concern: rows.filter((r) => r.effective_status === "CONCERN").length,
      normal: rows.filter((r) => r.effective_status === "NON_RISK").length,
    };
  }, [kpi, rows]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status && status !== "ALL") params.set("status", status);
    return `/api/admin/export/executive?${params.toString()}`;
  }, [q, status]);
  const handleApply = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status && status !== "ALL") params.set("status", status);
    router.push(`/admin/sessions?${params.toString()}`);
  };

  const handleReset = () => {
    setQ("");
    setStatus("ALL");
    router.push("/admin/sessions");
  };

  const onOpenSession = (sessionId: string) => {
    router.push(`/admin/sessions/${sessionId}`);
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (status && status !== "ALL") sp.set("status", status);
      sp.set("limit", "50");
      sp.set("cursor", cursor);

      const res = await fetch(`/api/admin/sessions?${sp.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());

      const j = (await res.json()) as {
        items: SessionRow[];
        nextCursor: string | null;
      };

      setRows((prev) => {
        const seen = new Set(prev.map((x) => x.session_id));
        const merged = [...prev];
        for (const it of j.items ?? []) {
          if (!seen.has(it.session_id)) merged.push(it);
        }
        return merged;
      });

      setCursor(j.nextCursor);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <LegendDialog open={legendOpen} onClose={() => setLegendOpen(false)} />

      <div className="relative">
        <GlowBg />

        <div className="relative mx-auto w-full px-4 md:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-2"
          >
            <div className="text-xl font-semibold">Admin – Sessions</div>
            <div className="text-sm text-muted-foreground">
              ตรวจสอบและ override การประเมินของ AI
            </div>
          </motion.div>

          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="ทั้งหมด" value={String(kpiView.total)} hint="รวมที่โหลดมาแล้ว" accent="blue" />
              <MetricCard title="RISK" value={String(kpiView.risk)} hint="ต้องจัดการ" accent="red" />
              <MetricCard title="CONCERN" value={String(kpiView.concern)} hint="ควรติดตาม" accent="amber" />
              <MetricCard title="NON_RISK" value={String(kpiView.normal)} hint="ข้อมูลทั่วไป" accent="cyan" />
            </div>

            <Filters
              q={q}
              setQ={setQ}
              status={status}
              setStatus={setStatus}
              onApply={handleApply}
              onReset={handleReset}
              brandBlue1={BRAND.blue1}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-12 space-y-3">
              <SessionsTable
                rows={rows}
                exportHref={exportHref}
                onOpenLegend={() => setLegendOpen(true)}
                onOpenSession={onOpenSession}
                brandBlue1={BRAND.blue1}
              />

              <div className="flex items-center justify-center">
                {cursor ? (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    ไม่มีข้อมูลเพิ่มเติมแล้ว
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
