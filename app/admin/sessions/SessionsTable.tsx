"use client";

import React from "react";
import Link from "next/link";
import {
  Download,
  MoreHorizontal,
  Send,

  // Status (ถ้าคุณแก้ตามที่คุยไว้ก่อนหน้า)
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  CheckCircle2,

  // Category
  Users,
  Workflow,
  BadgeCheck,
  Target,
  CircleDollarSign,

  // อื่นๆ
  ShieldQuestion,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import styles from "./sessions.module.css";

export type SessionRow = {
  session_id: string;
  proj_code: string | null;

  effective_status: "ISSUE" | "RISK" | "CONCERN" | "NON_RISK" | null;
  effective_primary_category: string | null;

  ai_status: string | null;
  ai_primary_category: string | null;

  has_override: boolean;
  overridden_at: string | null;

  last_message_at: string | null;
  last_message_snippet: string | null;

  ai_summary: string | null;

  is_sent_to_mpsmart: boolean;
  mpsmart_sent_at: string | null;

  is_admin_opened: boolean;
};

const statusConfig = {
  ISSUE: {
    cls: styles.issue,
    Icon: AlertTriangle,
    label: "ปัญหาที่เกิดขึ้นแล้ว (Issue)",
  },
  RISK: {
    cls: styles.risk,
    Icon: AlertCircle,
    label: "เสี่ยงจะเกิดปัญหา (Risk)",
  },
  CONCERN: {
    cls: styles.concern,
    Icon: HelpCircle,
    label: "ควรตรวจสอบ / ติดตาม (Concern)",
  },
  NON_RISK: {
    cls: styles.nonrisk,
    Icon: CheckCircle2,
    label: "ไม่มีความเสี่ยง (Non-risk)",
  },
} as const;

const categoryIcons: Record<string, any> = {
  People: Users, // คน/ทีม
  Process: Workflow, // ขั้นตอน/กระบวนการ
  Quality: BadgeCheck, // คุณภาพ/มาตรฐาน
  Financial: CircleDollarSign, // เงิน/งบประมาณ
  Scope: Target, // ขอบเขต/เป้าหมาย
  Unknown: HelpCircle, // ไม่ระบุ
};

function fmtTS(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return String(v);
  }
}

function getStatus(s: SessionRow) {
  return (s.effective_status || "NON_RISK") as keyof typeof statusConfig;
}

function getCategory(s: SessionRow) {
  return s.effective_primary_category || "Unknown";
}

function getSummary(s: SessionRow) {
  return (s.ai_summary?.trim() || s.last_message_snippet || "—").trim();
}

function SessionRowItem({
  s,
  idx,
  onOpenSession,
}: {
  s: SessionRow;
  idx: number;
  onOpenSession: (sessionId: string) => void;
}) {
  const status = getStatus(s);
  const cfg = statusConfig[status];
  const StatusIcon = cfg.Icon;

  const category = getCategory(s);
  const CatIcon = categoryIcons[category] || categoryIcons.Unknown;

  return (
    <TableRow className={styles.tr} onClick={() => onOpenSession(s.session_id)}>
      <TableCell className={`${styles.td} ${styles.noCell}`}>
        {idx + 1}
      </TableCell>

      <TableCell className={`${styles.td} ${styles.statusCell}`}>
        <div className={styles.statusTopRow}>
          {!s.is_admin_opened && (
            <span
              className={styles.unopenedDot}
              title="🟦 ยังไม่ถูกเปิดดูโดย Admin"
              aria-label="Unopened by admin"
            />
          )}
          

          <span
            className={styles.statusIconWrap}
            title={`${status} — ${cfg.label}`}
            aria-label={status}
          >
            <StatusIcon className={`${styles.statusIcon} ${cfg.cls}`} />
          </span>

          <span className={styles.categoryPill} title={`Category: ${category}`}>
            <CatIcon className="h-5 w-5" />
            <span>{category}</span>
          </span>

          {s.is_sent_to_mpsmart ? (
            <span
              className={styles.sentPill}
              title={`Sent to MPsmart at ${fmtTS(s.mpsmart_sent_at)}`}
            >
              <Send className="h-4 w-4" />
              <span>Sent</span>
            </span>
          ) : (
            <span className={styles.notSentPill} title="Not sent to MPsmart">
              <ShieldQuestion className="h-4 w-4" />
              <span>Not sent</span>
            </span>
          )}
        </div>

        <div className={styles.subline}>ล่าสุด: {fmtTS(s.last_message_at)}</div>
      </TableCell>

      <TableCell className={`${styles.td} ${styles.summaryCell}`}>
        <div className={styles.summaryWrap}>{getSummary(s)}</div>
      </TableCell>

      <TableCell
        className={`${styles.td} ${styles.moreCell}`}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full opacity-60 hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/sessions/${s.session_id}`}>Open detail</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Override status</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function SessionsTable({
  rows,
  exportHref,
  onOpenLegend,
  onOpenSession,
  brandBlue1,
}: {
  rows: SessionRow[];
  exportHref: string;
  onOpenLegend: () => void;
  onOpenSession: (sessionId: string) => void;
  brandBlue1: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base font-black">Sessions</CardTitle>
            <CardDescription className="text-xs">
              คลิกที่แถวเพื่อเปิดรายละเอียด
            </CardDescription>
          </div>

          <Button
            asChild
            className="gap-2"
            style={{ backgroundColor: brandBlue1 }}
          >
            <a href={exportHref}>
              <Download className="h-4 w-4" />
              Export Excel
            </a>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="overflow-hidden rounded-xl border">
          <Table className={styles.table}>
            <TableHeader>
              <TableRow>
                <TableHead className={`${styles.th} ${styles.colNo}`}>
                  No.
                </TableHead>
                <TableHead className={`${styles.th} ${styles.colStatus}`}>
                  <button
                    type="button"
                    className={styles.legendButton}
                    onClick={onOpenLegend}
                    title="คลิกเพื่อดูความหมายของสัญลักษณ์"
                  >
                    Status (Click here for details)
                  </button>
                </TableHead>
                <TableHead className={styles.th}>AI Summary</TableHead>
                <TableHead className={`${styles.th} ${styles.colMore}`} />
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((s, idx) => (
                <SessionRowItem
                  key={s.session_id}
                  s={s}
                  idx={idx}
                  onOpenSession={onOpenSession}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
