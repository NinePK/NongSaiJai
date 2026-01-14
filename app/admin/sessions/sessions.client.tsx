"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  BarChart3, Download, Filter, MoreHorizontal, RefreshCcw,
  Search, ShieldAlert, ShieldCheck, ShieldQuestion, Sparkles, User
} from "lucide-react";

// ===== Types =====
type SessionRow = {
  session_id: string;
  proj_code: string | null;
  effective_status: "RISK" | "CONCERN" | "NON_RISK" | null;
  effective_primary_category: string | null;
  ai_status: string | null;
  ai_primary_category: string | null;
  has_override: boolean;
  overridden_at: string | null;
  last_message_at: string | null;
  last_message_snippet: string | null;
  ai_summary: string | null;
};

type KPI = {
  total: number;
  normal: number;
  concern: number;
  risk: number;
};

// ===== Constants =====
const BRAND = {
  blue1: "#0231b0",
  blue2: "#042f81",
  cyan: "#449ddf",
  purple: "#6966b0",
};

const statusConfig = {
  RISK: { variant: "destructive" as const, icon: ShieldAlert },
  CONCERN: { variant: "secondary" as const, icon: ShieldQuestion },
  NON_RISK: { variant: "outline" as const, icon: ShieldCheck },
};

const categoryIcons: Record<string, any> = {
  People: User,
  Financial: BarChart3,
  Process: Sparkles,
  Quality: ShieldCheck,
  Unknown: ShieldQuestion,
};

// ===== Utils =====
const timeAgo = (iso: string | null) => {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาที`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.`;
  return `${Math.floor(hrs / 24)} วัน`;
};

const calculatePriority = (s: SessionRow) => {
  const statusWeight = s.effective_status === "RISK" ? 100 : 
                      s.effective_status === "CONCERN" ? 60 : 10;
  const overrideWeight = s.has_override ? 15 : 0;
  const ageMin = s.last_message_at 
    ? (Date.now() - new Date(s.last_message_at).getTime()) / 60000 
    : 999999;
  const freshnessWeight = ageMin < 60 ? 30 : ageMin < 360 ? 20 : ageMin < 1440 ? 10 : 0;
  const hasContent = (s.ai_summary?.trim() || s.last_message_snippet?.trim()) ? 8 : 0;
  
  return statusWeight + overrideWeight + freshnessWeight + hasContent;
};

// ===== Components =====
const GlowBg = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div
      className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
      style={{
        background: "radial-gradient(circle at 30% 30%, rgba(68,157,223,0.35), transparent 55%), radial-gradient(circle at 70% 40%, rgba(2,49,176,0.25), transparent 60%)"
      }}
    />
  </div>
);

const MetricCard = ({ title, value, hint, accent = "blue" }: {
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

const StatusBadge = ({ status }: { status: "RISK" | "CONCERN" | "NON_RISK" }) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-2">
      <Icon className="h-4 w-4" />
      <span className="font-extrabold">{status}</span>
    </Badge>
  );
};

const CategoryBadge = ({ category }: { category: string }) => {
  const Icon = categoryIcons[category] || categoryIcons.Unknown;
  return (
    <Badge variant="outline" className="gap-2">
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold">{category}</span>
    </Badge>
  );
};

const CategoryHeatSnapshot = ({ sessions }: { sessions: SessionRow[] }) => {
  const data = useMemo(() => {
    const focus = sessions.filter(s => s.effective_status !== "NON_RISK");
    const counts = new Map<string, number>();
    
    focus.forEach(s => {
      const cat = s.effective_primary_category || "Unknown";
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });

    const items = Array.from(counts.entries())
      .map(([k, v]) => ({ category: k, count: v }))
      .sort((a, b) => b.count - a.count);
    
    const total = items.reduce((sum, item) => sum + item.count, 0);
    const max = Math.max(...items.map(i => i.count), 1);
    
    return { items, total, max };
  }, [sessions]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-extrabold">Category Heat</CardTitle>
        <CardDescription className="text-xs">
          โฟกัสเฉพาะ RISK/CONCERN
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[560px] overflow-y-auto">
        {data.total === 0 ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
            ไม่มี RISK/CONCERN
          </div>
        ) : (
          data.items.map(({ category, count }) => {
            const Icon = categoryIcons[category] || categoryIcons.Unknown;
            const pct = Math.round((count / data.total) * 100);
            const width = Math.round((count / data.max) * 100);

            return (
              <div key={category} className="rounded-lg border bg-muted/10 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Icon className="h-3.5 w-3.5" />
                    {category}
                  </div>
                  <div className="text-xs font-extrabold tabular-nums">
                    {count} <span className="text-muted-foreground">({pct}%)</span>
                  </div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/30">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${width}%`,
                      background: "linear-gradient(90deg, rgba(2,49,176,0.45), rgba(68,157,223,0.45))"
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

const Filters = ({ q, setQ, status, setStatus, onApply, onReset }: {
  q: string;
  setQ: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  onApply: () => void;
  onReset: () => void;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา session / รหัสโครงการ"
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All status</SelectItem>
              <SelectItem value="RISK">RISK</SelectItem>
              <SelectItem value="CONCERN">CONCERN</SelectItem>
              <SelectItem value="NON_RISK">NON_RISK</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="default" className="gap-2" style={{ backgroundColor: BRAND.blue1 }} onClick={onApply}>
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" className="gap-2" onClick={onReset}>
            <RefreshCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const SessionsTable = ({ rows, exportHref }: { rows: SessionRow[]; exportHref: string }) => (
  <Card>
    <CardHeader className="pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="text-base font-black">Sessions</CardTitle>
          <CardDescription className="text-xs">
            คลิกที่แถวเพื่อเปิดรายละเอียด
          </CardDescription>
        </div>
        <Button asChild className="gap-2" style={{ backgroundColor: BRAND.blue1 }}>
          <a href={exportHref}>
            <Download className="h-4 w-4" />
            Export Excel
          </a>
        </Button>
      </div>
    </CardHeader>
    <CardContent className="pt-4">
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[240px]">Session</TableHead>
              <TableHead className="w-[360px]">Status</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="w-[56px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => {
              const status = (s.effective_status || "NON_RISK") as "RISK" | "CONCERN" | "NON_RISK";
              const category = s.effective_primary_category || "Unknown";
              const summary = s.ai_summary?.trim() || s.last_message_snippet || "";
              const timestamp = s.last_message_at
                ? new Date(s.last_message_at).toISOString().slice(0, 16).replace("T", " ")
                : "—";

              return (
                <TableRow
                  key={s.session_id}
                  className="group cursor-pointer hover:bg-muted/40"
                  onClick={() => window.location.href = `/admin/sessions/${s.session_id}`}
                >
                  <TableCell className="py-3">
                    <div className="font-mono text-xs font-semibold">
                      {s.session_id.slice(0, 8)}…
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {s.proj_code || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={status} />
                      <CategoryBadge category={category} />
                      {s.has_override && (
                        <span
                          className="ml-1 inline-flex h-2 w-2 rounded-full"
                          title="Override"
                          style={{ backgroundColor: BRAND.blue1 }}
                        />
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      ล่าสุด: {timestamp}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="line-clamp-1 text-sm">{summary}</div>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full opacity-60 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/sessions/${s.session_id}`}>
                            Open detail
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Override status</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

// ===== Main Component =====
export default function AdminSessionsClient({
  sessions,
  kpi,
  initialQuery,
  initialStatus,
}: {
  sessions: SessionRow[];
  kpi: KPI | null;
  initialQuery: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus || "ALL");

  const kpiView = useMemo(() => {
    if (kpi) return kpi;
    return {
      total: sessions.length,
      risk: sessions.filter(r => r.effective_status === "RISK").length,
      concern: sessions.filter(r => r.effective_status === "CONCERN").length,
      normal: sessions.filter(r => r.effective_status === "NON_RISK").length,
    };
  }, [kpi, sessions]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status && status !== "ALL") params.set("status", status);
    return `/api/admin/export/executive?${params}`;
  }, [q, status]);

  const handleApply = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status && status !== "ALL") params.set("status", status);
    router.push(`/admin/sessions?${params}`);
  };

  const handleReset = () => {
    setQ("");
    setStatus("ALL");
    router.push("/admin/sessions");
  };

  return (
    <div className="min-h-screen bg-background">
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
              <MetricCard title="ทั้งหมด" value={String(kpiView.total)} hint="รวมตาม filter" accent="blue" />
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
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-9">
              <SessionsTable rows={sessions} exportHref={exportHref} />
            </div>
            <div className="lg:col-span-3">
              <CategoryHeatSnapshot sessions={sessions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}