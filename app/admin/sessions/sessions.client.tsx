// app/admin/sessions/sessions.client.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence,motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { LegendDialog } from "./LegendDialog";
import { Filters } from "./Filters";
import { SessionsTable, type SessionRow } from "./SessionsTable";
import kpiStyles from "./kpi-animated.module.css";

export type KPI = {
  total: number;
  issue: number;
  normal: number;
  concern: number;
  risk: number;
};

const BRAND_BLUE = "#0231b0";

const GlowBg = () => (
  <div
    className="pointer-events-none absolute inset-0 overflow-hidden"
    aria-hidden
  >
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

const AnimatedMetricCard = ({
  title,
  value,
  hint,
  variant,
}: {
  title: string;
  value: string;
  hint?: string;
  variant: "total" | "issue" | "risk" | "concern" | "ok";
}) => {
  const baseMap: Record<typeof variant, string> = {
    total: kpiStyles.totalBase,
    issue: kpiStyles.issueBase,
    risk: kpiStyles.riskBase,
    concern: kpiStyles.concernBase,
    ok: kpiStyles.okBase,
  };

  const fxMap: Record<typeof variant, string> = {
    total: kpiStyles.totalFx,
    issue: kpiStyles.issueFx,
    risk: kpiStyles.riskFx,
    concern: kpiStyles.concernFx,
    ok: kpiStyles.okFx,
  };

return (
  <Card
    className={`
      ${kpiStyles.card}
      ${baseMap[variant]}
      ${variant === "total" ? kpiStyles.stars : ""}
    `}
  >
    {/* เอฟเฟกต์ Galaxy / Cyber / Aurora */}
    <div
      className={`
        ${kpiStyles.fx}
        ${fxMap[variant]}
      `}
      aria-hidden
    />

    {/* เนื้อหาการ์ด */}
    <CardHeader
      className={`
        ${kpiStyles.inner}
        pb-3
        relative
      `}
    >
      <CardDescription className={kpiStyles.label}>
        {title}
      </CardDescription>

      <CardTitle className={kpiStyles.bigNumber}>
        {value}
      </CardTitle>

      {hint && (
        <div className={kpiStyles.hint}>
          {hint}
        </div>
      )}
    </CardHeader>
  </Card>
);
};

const sameArray = (a: string[] = [], b: string[] = []) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
};
const NSJ_QUOTES = [
  "Risk ไม่ได้หายไป…มันแค่ย้ายไปอยู่ในวัน Deploy 😇",
  "Deploy ครั้งนี้เล็กนิดเดียว ยกเว้นผลกระทบ",
  "ถ้าทุกอย่างดูโอเคมาก แปลว่าเรายังไม่ได้เปิด Log",
  "ไม่มีปัญหา = ยังไม่มีใครรายงาน (หรือยังไม่ได้ถาม)",
  "Timeline คือคำสัญญา…ที่มักโดน bug แทรกกลางทาง",
  "บอกว่า ‘ไม่น่ามีความเสี่ยง’ แล้วเจอ prod ล่ม…คลาสสิก",
  "Risk register ไม่ได้น่ากลัว…ถ้าเราไม่เปิดมัน",
  "วันนี้ไม่มี Issue…เพราะยังไม่ถึงเวลา standup",
  "User บอกระบบพัง แต่ลืมเปิดเครื่อง",
  "ถ้าไม่มีใครบ่น แปลว่ายังไม่มีใครรู้",
  "Timeline ยังอยู่ แค่ขยับไปเรื่อย ๆ",
  "ขั้นตอนมีอยู่จริง แต่อยู่ในหัวคนที่ลาออกไปแล้ว",
  "IT แก้ได้หมด ยกเว้นความเข้าใจ",
  "Evidence มีครบ แต่ต้องใช้จินตนาการนิดหน่อย",
  "Policy เขียนว่า least privilege แต่ prod ใช้ admin",
  "แก้ production ก่อน แล้วค่อยอัปเดต change log",
];

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const RiskQuoteRotator: React.FC = () => {
  const BAG_KEY = "nsj_quote_bag_v1";
  const IDX_KEY = "nsj_quote_idx_v1";

  const [bag, setBag] = React.useState<number[]>([]);
  const [idx, setIdx] = React.useState<number>(0);

  // ✅ init shuffle bag (survive remount)
  React.useEffect(() => {
    try {
      const savedBag = sessionStorage.getItem(BAG_KEY);
      const savedIdx = Number(sessionStorage.getItem(IDX_KEY));

      if (savedBag) {
        const parsed = JSON.parse(savedBag) as number[];
        if (Array.isArray(parsed) && parsed.length === NSJ_QUOTES.length) {
          setBag(parsed);
          setIdx(
            Number.isFinite(savedIdx) && savedIdx >= 0 && savedIdx < parsed.length
              ? savedIdx
              : 0
          );
          return;
        }
      }

      const newBag = shuffle(NSJ_QUOTES.map((_, i) => i));
      setBag(newBag);
      setIdx(0);
      sessionStorage.setItem(BAG_KEY, JSON.stringify(newBag));
      sessionStorage.setItem(IDX_KEY, "0");
    } catch {
      const newBag = shuffle(NSJ_QUOTES.map((_, i) => i));
      setBag(newBag);
      setIdx(0);
    }
  }, []);

  // ✅ schedule next tick (no interval stacking)
  React.useEffect(() => {
    if (!bag.length) return;

    const t = window.setTimeout(() => {
      setIdx((cur) => {
        let next = cur + 1;

        // ✅ if reach end → reshuffle new bag (ครบทุกประโยคแล้วค่อยเริ่มใหม่)
        if (next >= bag.length) {
          const newBag = shuffle(NSJ_QUOTES.map((_, i) => i));
          setBag(newBag);
          try {
            sessionStorage.setItem(BAG_KEY, JSON.stringify(newBag));
            sessionStorage.setItem(IDX_KEY, "0");
          } catch {}
          return 0;
        }

        try {
          sessionStorage.setItem(IDX_KEY, String(next));
        } catch {}

        return next;
      });
    }, 4200);

    return () => window.clearTimeout(t);
  }, [idx, bag]);

  // ✅ always return JSX (avoid void type)
  if (!bag.length) {
    return <div className="h-[22px]" />;
  }

  const quote = NSJ_QUOTES[bag[idx]];

  return (
    <div className="text-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${bag[idx]}-${idx}`}
          initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="text-[16px] md:text-[18px] font-semibold text-muted-foreground tracking-tight"
          style={{ willChange: "transform, opacity" }}
        >
          <span className="nsj-quote-float">“{quote}”</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
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
    Array.isArray(initialConcernScopes) ? initialConcernScopes : [],
  );
  const [backofficeTeams, setBackofficeTeams] = useState<string[]>(
    Array.isArray(initialBackofficeTeams) ? initialBackofficeTeams : [],
  );

  // Table states
  const [rows, setRows] = useState<SessionRow[]>(sessions);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const lastNavRef = useRef<string>("");

  useEffect(() => setHydrated(true), []);

  const buildQueryString = (
    override?: Partial<{
      q: string;
      status: string;
      category: string;
      mpsent: string;
      month: string;
      concernScopes: string[];
      backofficeTeams: string[];
    }>,
  ) => {
    const state = {
      q,
      status,
      category,
      mpsent,
      month,
      concernScopes,
      backofficeTeams,
    };
    const merged = { ...state, ...override };

    const params = new URLSearchParams();
    const _q = merged.q.trim();

    if (_q) params.set("q", _q);
    if (merged.status !== "ALL") params.set("status", merged.status);
    if (merged.category !== "ALL") params.set("category", merged.category);
    if (merged.mpsent !== "ALL") params.set("mpsent", merged.mpsent);
    if (merged.month) params.set("month", merged.month);

    merged.concernScopes.forEach((s: string) =>
      params.append("concern_scope", s),
    );

    if (merged.concernScopes.includes("BACKOFFICE")) {
      merged.backofficeTeams.forEach((t: string) =>
        params.append("backoffice_team", t),
      );
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
    const nextConcern = Array.isArray(initialConcernScopes)
      ? initialConcernScopes
      : [];
    const nextBackoffice = Array.isArray(initialBackofficeTeams)
      ? initialBackofficeTeams
      : [];

    if (q !== nextQ) setQ(nextQ);
    if (status !== nextStatus) setStatus(nextStatus);
    if (category !== nextCategory) setCategory(nextCategory);
    if (mpsent !== nextMpSent) setMpsent(nextMpSent);
    if (month !== nextMonth) setMonth(nextMonth);
    if (!sameArray(concernScopes, nextConcern)) setConcernScopes(nextConcern);
    if (!sameArray(backofficeTeams, nextBackoffice))
      setBackofficeTeams(nextBackoffice);

    setRows(sessions);
    setCursor(nextCursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialQuery,
    initialStatus,
    initialCategory,
    initialMpSent,
    initialMonth,
    initialConcernScopes,
    initialBackofficeTeams,
    sessions,
    nextCursor,
  ]);

  // Debounced URL update
  useEffect(() => {
    if (!hydrated) return;

    const t = setTimeout(() => {
      const nextUrl = `/admin/sessions${buildQueryString()}`;
      const currentUrl =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "";

      if (nextUrl === currentUrl || lastNavRef.current === nextUrl) return;

      lastNavRef.current = nextUrl;
      router.replace(nextUrl);
    }, 500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    q,
    status,
    category,
    mpsent,
    month,
    concernScopes,
    backofficeTeams,
    hydrated,
  ]);

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
      backofficeTeams.forEach((t: string) =>
        params.append("backoffice_team", t),
      );
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
          {/* ✅ Header (centered + bold) + rotating quotes */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex flex-col gap-3 items-center"
          >
            {/* Title */}
            <div
              className="
      text-[28px] md:text-[30px]
      font-black tracking-tight text-center
      bg-clip-text text-transparent
      bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900
      dark:from-slate-100 dark:via-slate-200 dark:to-slate-100
    "
            >
              น้องใส่ใจ – Admin override
            </div>

            {/* Quote */}
            <RiskQuoteRotator />
          </motion.div>

          {/* ✅ KPI + Filters */}
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <AnimatedMetricCard
                title="ทั้งหมด"
                value={String(kpiView.total)}
                hint="รวมที่โหลดมาแล้ว"
                variant="total"
              />
              <AnimatedMetricCard
                title="ISSUE"
                value={String(kpiView.issue)}
                hint="เกิดขึ้นแล้ว"
                variant="issue"
              />
              <AnimatedMetricCard
                title="RISK"
                value={String(kpiView.risk)}
                hint="ต้องจัดการ"
                variant="risk"
              />
              <AnimatedMetricCard
                title="CONCERN"
                value={String(kpiView.concern)}
                hint="ควรติดตาม"
                variant="concern"
              />
              <AnimatedMetricCard
                title="Informational - NO RISK"
                value={String(kpiView.normal)}
                hint="ข้อมูลทั่วไป"
                variant="ok"
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

          {/* ✅ Table */}
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
