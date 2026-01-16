"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, RefreshCcw, Search } from "lucide-react";

export function Filters({
  q,
  setQ,
  status,
  setStatus,
  onApply,
  onReset,
  brandBlue1,
}: {
  q: string;
  setQ: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  onApply: () => void;
  onReset: () => void;
  brandBlue1: string;
}) {
  return (
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
                <SelectItem value="ISSUE">ISSUE</SelectItem>
                <SelectItem value="RISK">RISK</SelectItem>
                <SelectItem value="CONCERN">CONCERN</SelectItem>
                <SelectItem value="NON_RISK">NON_RISK</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="default"
              className="gap-2"
              style={{ backgroundColor: brandBlue1 }}
              onClick={onApply}
            >
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
}
