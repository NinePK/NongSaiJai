// app/admin/sessions/Filters.tsx
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, X } from "lucide-react";

// ✅ เอา enum เดียวกับ concern-targets
const CONCERN_SCOPE_ITEMS = [
  { value: "PM", label: "PM" },
  { value: "PROJECT_TEAM", label: "Project Team" },
  { value: "BACKOFFICE", label: "Backoffice" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "VENDOR", label: "Vendor" },
] as const;

const BACKOFFICE_TEAM_ITEMS = [
  { value: "CASC", label: "CASC ทีมสื่อสาร" },
  { value: "ACCOUNTING", label: "ACCOUNTING ทีมบัญชี" },
  { value: "IT_SUPPORT", label: "IT_SUPPORT ทีม IT" },
  { value: "PURCHASE", label: "PURCHASE ทีมจัดซื้อ" },
  { value: "LEGAL", label: "LEGAL ทีมกฎหมาย" },
  { value: "HR", label: "HR ทีม PE / HR" },
] as const;

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function pillText(selected: string[], items: readonly { value: string; label: string }[], emptyLabel: string) {
  if (!selected?.length) return emptyLabel;
  const map = new Map(items.map((x) => [x.value, x.label]));
  const labels = selected.map((v) => map.get(v) ?? v);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

function MultiSelect({
  title,
  placeholder,
  items,
  value,
  onChange,
  triggerClassName,
  contentClassName,
  widthClassName,
}: {
  title: string;
  placeholder: string;
  items: readonly { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  triggerClassName: string;
  contentClassName: string;
  widthClassName: string;
}) {
  const selected = value ?? [];

  const toggle = (v: string, checked: boolean) => {
    if (checked) onChange(uniq([...selected, v]));
    else onChange(selected.filter((x) => x !== v));
  };

  const clear = () => onChange([]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`${widthClassName} ${triggerClassName} flex items-center justify-between px-3 rounded-md`}
        >
          <div className="flex flex-col items-start leading-tight">
            <div className="text-[11px] font-semibold text-muted-foreground">
              {title}
            </div>
            <div className="text-sm font-semibold">
              {pillText(selected, items, placeholder)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <span
                className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clear();
                }}
                title="Clear"
                aria-label="Clear"
              >
                <X className="h-4 w-4 opacity-70" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-70" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={`${contentClassName} w-[320px] p-3`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-black">{title}</div>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2"
            onClick={clear}
            disabled={!selected.length}
          >
            Clear
          </Button>
        </div>

        <div className="grid gap-2">
          {items.map((it) => {
            const checked = selected.includes(it.value);
            return (
              <label
                key={it.value}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggle(it.value, Boolean(v))}
                />
                <div className="text-sm font-semibold">{it.label}</div>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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

  // ✅ NEW (multi)
  concernScopes,
  setConcernScopes,
  backofficeTeams,
  setBackofficeTeams,

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

  // ✅ multi
  concernScopes: string[]; // e.g. ["PM","BACKOFFICE"]
  setConcernScopes: (v: string[]) => void;
  backofficeTeams: string[]; // e.g. ["IT_SUPPORT","LEGAL"]
  setBackofficeTeams: (v: string[]) => void;

  onReset: () => void;
}) {
  const triggerCls =
    "h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm";
  const contentCls =
    "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg";

  const hasBackoffice = (concernScopes ?? []).includes("BACKOFFICE");

  // ✅ เงื่อนไขโชว์: โชว์ตอน status=CONCERN หรือมีการเลือก filter แล้ว
  const showConcernFilters =
    status === "CONCERN" || (concernScopes?.length ?? 0) > 0 || (backofficeTeams?.length ?? 0) > 0;

  // ถ้าไม่ได้เลือก BACKOFFICE แล้วเคยเลือกทีมไว้ -> เคลียร์ทิ้ง
  React.useEffect(() => {
    if (!hasBackoffice && (backofficeTeams?.length ?? 0) > 0) {
      setBackofficeTeams([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBackoffice]);

  return (
    <div className="flex flex-wrap gap-3 justify-center items-center">
      <Input
        placeholder="ค้นหา keyword / Project code"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-11 w-[260px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm"
      />

      {/* status (single) */}
      <select
        value={status}
        onChange={(e) => {
          const v = e.target.value;
          setStatus(v);

          // ✅ ถ้าออกจาก CONCERN: reset multi concern filters
          if (v !== "CONCERN") {
            setConcernScopes([]);
            setBackofficeTeams([]);
          }
        }}
        className={`w-[170px] ${triggerCls} rounded-md px-3 font-semibold`}
      >
        <option value="ALL">All status</option>
        <option value="ISSUE">ISSUE</option>
        <option value="RISK">RISK</option>
        <option value="CONCERN">CONCERN</option>
        <option value="NON_RISK">INFO - NO RISK</option>
      </select>

      {/* category (single) */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={`w-[180px] ${triggerCls} rounded-md px-3 font-semibold`}
      >
        <option value="ALL">All category</option>
        <option value="People">People</option>
        <option value="Process">Process</option>
        <option value="Quality">Quality</option>
        <option value="Financial">Financial</option>
        <option value="Scope">Scope</option>
      </select>

      {/* mpsent (single) */}
      <select
        value={mpsent}
        onChange={(e) => setMpsent(e.target.value)}
        className={`w-[180px] ${triggerCls} rounded-md px-3 font-semibold`}
      >
        <option value="ALL">All</option>
        <option value="SENT">Sent</option>
        <option value="NOT_SENT">Not sent</option>
      </select>

      <Input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className="h-11 w-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm"
      />

      {/* ✅ multi: concern scopes */}
      {showConcernFilters && (
        <MultiSelect
          title="CONCERN ถึงใคร (Scope)"
          placeholder="All (Concern scope)"
          items={CONCERN_SCOPE_ITEMS}
          value={concernScopes}
          onChange={(next) => {
            const fixed = uniq(next);

            setConcernScopes(fixed);

            // ถ้าเอา BACKOFFICE ออก -> เคลียร์ทีม
            if (!fixed.includes("BACKOFFICE")) {
              setBackofficeTeams([]);
            }
          }}
          triggerClassName={triggerCls}
          contentClassName={contentCls}
          widthClassName="w-[260px]"
        />
      )}

      {/* ✅ multi: backoffice teams (only if BACKOFFICE selected) */}
      {showConcernFilters && hasBackoffice && (
        <MultiSelect
          title="Backoffice team"
          placeholder="All (Default)"
          items={BACKOFFICE_TEAM_ITEMS}
          value={backofficeTeams}
          onChange={(next) => setBackofficeTeams(uniq(next))}
          triggerClassName={triggerCls}
          contentClassName={contentCls}
          widthClassName="w-[260px]"
        />
      )}

      <Button
        variant="outline"
        className="h-11 px-6"
        onClick={() => {
          onReset();
        }}
      >
        Reset
      </Button>
    </div>
  );
}
