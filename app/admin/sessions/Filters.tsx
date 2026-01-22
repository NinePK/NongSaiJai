"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function Filters({
  q,
  setQ,
  status,
  setStatus,
  category,
  setCategory,
  mpsent,
  setMpsent,
  month,
  setMonth,
  onReset,
}: {
  q: string;
  setQ: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  mpsent: string;
  setMpsent: (v: string) => void;
  month: string;
  setMonth: (v: string) => void;
  onReset: () => void;
}) {
  const triggerCls =
    "h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm";
  const contentCls =
    "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg";

  return (
    <div className="flex flex-wrap gap-3 justify-center items-center">
      <Input
        placeholder="ค้นหา keyword / Project code"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-11 w-[260px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm"
      />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className={`w-[170px] ${triggerCls}`}>
          <SelectValue placeholder="All status" />
        </SelectTrigger>
        <SelectContent className={contentCls}>
          <SelectItem value="ALL">All status</SelectItem>
          <SelectItem value="ISSUE">ISSUE</SelectItem>
          <SelectItem value="RISK">RISK</SelectItem>
          <SelectItem value="CONCERN">CONCERN</SelectItem>
          <SelectItem value="NON_RISK">INFO - NO RISK</SelectItem>
        </SelectContent>
      </Select>

      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className={`w-[180px] ${triggerCls}`}>
          <SelectValue placeholder="All category" />
        </SelectTrigger>
        <SelectContent className={contentCls}>
          <SelectItem value="ALL">All category</SelectItem>
          <SelectItem value="People">People</SelectItem>
          <SelectItem value="Process">Process</SelectItem>
          <SelectItem value="Quality">Quality</SelectItem>
          <SelectItem value="Financial">Financial</SelectItem>
          <SelectItem value="Scope">Scope</SelectItem>
        </SelectContent>
      </Select>

      <Select value={mpsent} onValueChange={setMpsent}>
        <SelectTrigger className={`w-[180px] ${triggerCls}`}>
          <SelectValue placeholder="MPsmart" />
        </SelectTrigger>
        <SelectContent className={contentCls}>
          <SelectItem value="ALL">All</SelectItem>
          <SelectItem value="SENT">Sent</SelectItem>
          <SelectItem value="NOT_SENT">Not sent</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className="h-11 w-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm"
      />

      <Button variant="outline" className="h-11 px-6" onClick={onReset}>
        Reset
      </Button>


    </div>
  );
}
