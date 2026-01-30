// app/admin/sessions/sessions.client.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { LegendDialog } from "./LegendDialog";
import { Filters } from "./Filters";
import { SessionsTable, type SessionRow } from "./SessionsTable";

export type KPI = {
  total: number;
  issue: number;
  normal: number;
  concern: number;
  risk: number;
};

const BRAND_BLUE = "#0231b0";

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

const METRIC_GRADIENTS = {
  blue: "from-[rgba(2,49,176,0.18)]",
  cyan: "from-[rgba(68,157,223,0.20)]",
  red: "from-[rgba(220,38,38,0.14)]",
  amber: "from-[rgba(245,158,11,0.14)]",
} as const;

const MetricCard = ({
  title,
  value,
  hint,
  accent = "blue",
}: {
  title: string;
  value: string;
  hint?: string;
  accent?: keyof typeof METRIC_GRADIENTS;
}) => (
  <Card className="relative overflow-hidden">
    <div className={`absolute inset-0 bg-gradient-to-br ${METRIC_GRADIENTS[accent]} to-transparent`} />
    <CardHeader className="relative pb-2">
      <CardDescription className="text-xs font-semibold">{title}</CardDescription>
      <CardTitle className="text-3xl font-black">{value}</CardTitle>
      {hint && <div className="text-xs text-muted-foreground pt-2">{hint}</div>}
    </CardHeader>
  </Card>
);

const sameArray = (a: string[] = [], b: string[] = []) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
};

export default function AdminSessionsClient({
  sessions,
  nextCursor,
  kpi,
  initialQuery,
  initialStatus,
  initialCategory = "ALL",
  initialMpSent = "ALL",
  initialMonth = "",
  initialConcernScopes = [],
  initialBackofficeTeams = [],
}: {
  sessions: SessionRow[];
  nextCursor: string | null;
  kpi: KPI | null;
  initialQuery: string;
  initialStatus: string;
  initialCategory?: string;
  initialMpSent?: string;
  initialMonth?: string;
  initialConcernScopes?: string[];
  initialBackofficeTeams?: string[];
}) {
  const router = useRouter();

  // Filter states
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus || "ALL");
  const [category, setCategory] = useState(initialCategory || "ALL");
  const [mpsent, setMpsent] = useState(initialMpSent || "ALL");
  const [month, setMonth] = useState(initialMonth || "");
  const [concernScopes, setConcernScopes] = useState<string[]>(
    Array.isArray(initialConcernScopes) ? initialConcernScopes : []
  );
  const [backofficeTeams, setBackofficeTeams] = useState<string[]>(
    Array.isArray(initialBackofficeTeams) ? initialBackofficeTeams : []
  );

  // Table states
  const [rows, setRows] = useState<SessionRow[]>(sessions);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const lastNavRef = useRef<string>("");

  useEffect(() => setHydrated(true), []);

  const buildQueryString = (override?: Partial<{
    q: string;
    status: string;
    category: string;
    mpsent: string;
    month: string;
    concernScopes: string[];
    backofficeTeams: string[];
  }>) => {
    const state = { q, status, category, mpsent, month, concernScopes, backofficeTeams };
    const merged = { ...state, ...override };
    
    const params = new URLSearchParams();
    const _q = merged.q.trim();
    
    if (_q) params.set("q", _q);
    if (merged.status !== "ALL") params.set("status", merged.status);
    if (merged.category !== "ALL") params.set("category", merged.category);
    if (merged.mpsent !== "ALL") params.set("mpsent", merged.mpsent);
    if (merged.month) params.set("month", merged.month);

    merged.concernScopes.forEach((s: string) => params.append("concern_scope", s));

    if (merged.concernScopes.includes("BACKOFFICE")) {
      merged.backofficeTeams.forEach((t: string) => params.append("backoffice_team", t));
    }

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  // Sync URL params without bounce
  useEffect(() => {
    const nextQ = initialQuery ?? "";
    const nextStatus = initialStatus || "ALL";
    const nextCategory = initialCategory || "ALL";
    const nextMpSent = initialMpSent || "ALL";
    const nextMonth = initialMonth || "";
    const nextConcern = Array.isArray(initialConcernScopes) ? initialConcernScopes : [];
    const nextBackoffice = Array.isArray(initialBackofficeTeams) ? initialBackofficeTeams : [];

    if (q !== nextQ) setQ(nextQ);
    if (status !== nextStatus) setStatus(nextStatus);
    if (category !== nextCategory) setCategory(nextCategory);
    if (mpsent !== nextMpSent) setMpsent(nextMpSent);
    if (month !== nextMonth) setMonth(nextMonth);
    if (!sameArray(concernScopes, nextConcern)) setConcernScopes(nextConcern);
    if (!sameArray(backofficeTeams, nextBackoffice)) setBackofficeTeams(nextBackoffice);

    setRows(sessions);
    setCursor(nextCursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialStatus, initialCategory, initialMpSent, initialMonth, 
      initialConcernScopes, initialBackofficeTeams, sessions, nextCursor]);

  // Debounced URL update
  useEffect(() => {
    if (!hydrated) return;

    const t = setTimeout(() => {
      const nextUrl = `/admin/sessions${buildQueryString()}`;
      const currentUrl = typeof window !== "undefined" 
        ? `${window.location.pathname}${window.location.search}` 
        : "";

      if (nextUrl === currentUrl || lastNavRef.current === nextUrl) return;
      
      lastNavRef.current = nextUrl;
      router.replace(nextUrl);
    }, 500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, category, mpsent, month, concernScopes, backofficeTeams, hydrated]);

  // Compute KPI
  const kpiView = useMemo(() => {
    const fallback = {
      total: rows.length,
      issue: rows.filter((r) => r.effective_status === "ISSUE").length,
      risk: rows.filter((r) => r.effective_status === "RISK").length,
      concern: rows.filter((r) => r.effective_status === "CONCERN").length,
      normal: rows.filter((r) => r.effective_status === "NON_RISK").length,
    };

    if (!kpi) return fallback;

    return {
      total: kpi.total ?? fallback.total,
      issue: (kpi as any).issue ?? fallback.issue,
      risk: kpi.risk ?? fallback.risk,
      concern: kpi.concern ?? fallback.concern,
      normal: kpi.normal ?? fallback.normal,
    };
  }, [kpi, rows]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    const _q = q.trim();

    if (_q) params.set("q", _q);
    if (status !== "ALL") params.set("status", status);
    if (category !== "ALL") params.set("category", category);
    if (mpsent !== "ALL") params.set("mpsent", mpsent);
    if (month) params.set("month", month);

    concernScopes.forEach((s: string) => params.append("concern_scope", s));

    if (concernScopes.includes("BACKOFFICE")) {
      backofficeTeams.forEach((t: string) => params.append("backoffice_team", t));
    }

    return `/api/admin/export/executive?${params.toString()}`;
  }, [q, status, category, mpsent, month, concernScopes, backofficeTeams]);

  const handleReset = () => {
    setQ("");
    setStatus("ALL");
    setCategory("ALL");
    setMpsent("ALL");
    setMonth("");
    setConcernScopes([]);
    setBackofficeTeams([]);
    router.replace("/admin/sessions");
  };

  const onOpenSession = (sessionId: string) => {
    router.push(`/admin/sessions/${sessionId}`);
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const sp = new URLSearchParams();
      const _q = q.trim();

      if (_q) sp.set("q", _q);
      if (status !== "ALL") sp.set("status", status);
      if (category !== "ALL") sp.set("category", category);
      if (mpsent !== "ALL") sp.set("mpsent", mpsent);
      if (month) sp.set("month", month);

      concernScopes.forEach((s: string) => sp.append("concern_scope", s));
      if (concernScopes.includes("BACKOFFICE")) {
        backofficeTeams.forEach((t: string) => sp.append("backoffice_team", t));
      }

      sp.set("limit", "50");
      sp.set("cursor", cursor);

      const res = await fetch(`/api/admin/sessions?${sp.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());

      const j = (await res.json()) as { items: SessionRow[]; nextCursor: string | null };

      setRows((prev) => {
        const seen = new Set(prev.map((x) => x.session_id));
        return [...prev, ...j.items.filter((it) => !seen.has(it.session_id))];
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
            <div className="text-xl font-semibold">น้องใส่ใจ - Admin override</div>
            <div className="text-sm text-muted-foreground">
              ระบบตรวจสอบและจัดการข้อมูลจากแชทจากน้องใส่ใจ
            </div>
          </motion.div>

          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard title="ทั้งหมด" value={String(kpiView.total)} hint="รวมที่โหลดมาแล้ว" accent="blue" />
              <MetricCard title="ISSUE" value={String(kpiView.issue)} hint="เกิดขึ้นแล้ว" accent="red" />
              <MetricCard title="RISK" value={String(kpiView.risk)} hint="ต้องจัดการ" accent="red" />
              <MetricCard title="CONCERN" value={String(kpiView.concern)} hint="ควรติดตาม" accent="amber" />
              <MetricCard
                title="Informational - NO RISK"
                value={String(kpiView.normal)}
                hint="ข้อมูลทั่วไป"
                accent="cyan"
              />
            </div>

            <Filters
              q={q}
              setQ={setQ}
              status={status}
              setStatus={setStatus}
              category={category}
              setCategory={setCategory}
              mpsent={mpsent}
              setMpsent={setMpsent}
              month={month}
              setMonth={setMonth}
              concernScopes={concernScopes}
              setConcernScopes={setConcernScopes}
              backofficeTeams={backofficeTeams}
              setBackofficeTeams={setBackofficeTeams}
              onReset={handleReset}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-12 space-y-3">
              <SessionsTable
                rows={rows}
                exportHref={exportHref}
                onOpenLegend={() => setLegendOpen(true)}
                onOpenSession={onOpenSession}
                brandBlue1={BRAND_BLUE}
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
                  <div className="text-xs text-muted-foreground">ไม่มีข้อมูลเพิ่มเติมแล้ว</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}