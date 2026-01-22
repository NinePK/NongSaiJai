"use client";

import React from "react";
import {
  X,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Square,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import styles from "./sessions.module.css";

type LegendItem = {
  key: string;
  name: string;
  desc: string;
  Icon: React.ComponentType<any>;
  iconClass: string;
};

const LEGEND: LegendItem[] = [
  {
    key: "ISSUE",
    name: "ISSUE",
    desc: "ปัญหาที่เกิดขึ้นแล้ว ต้องแก้ทันที",
    Icon: AlertTriangle,
    iconClass: styles.issue,
  },
  {
    key: "RISK",
    name: "RISK",
    desc: "ยังไม่เกิด แต่มีแนวโน้มจะเกิด",
    Icon: AlertCircle,
    iconClass: styles.risk,
  },
  {
    key: "CONCERN",
    name: "CONCERN",
    desc: "ควรตรวจสอบ / เฝ้าระวัง",
    Icon: HelpCircle,
    iconClass: styles.concern,
  },
  {
    key: "NON_RISK",
    name: "INFO - NO RISK",
    desc: "ไม่มีความเสี่ยง",
    Icon: CheckCircle2,
    iconClass: styles.nonrisk,
  },
  {
    key: "UNOPENED",
    name: "🟦",
    desc: "ยังไม่ถูกเปิดดูโดย Admin",
    Icon: Square,
    iconClass: styles.unopened,
  },
  {
    key: "SENT",
    name: "Sent",
    desc: "ข้อมูลถูกส่งไปยัง MPsmart แล้ว",
    Icon: Send,
    iconClass: styles.sent,
  },
];


export function LegendDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className={styles.dialogBackdrop} role="dialog" aria-modal="true">
      <div className={styles.dialogPanel}>
        <div className={styles.dialogHeader}>
          <div className={styles.dialogTitle}>Status Legend</div>
          <button className={styles.dialogClose} onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={styles.dialogBody}>
          <div className={styles.legendGrid}>
            {LEGEND.map(({ key, name, desc, Icon, iconClass }) => (
              <div key={key} className={styles.legendRow}>
                <span className={styles.legendIconWrap}>
                  <Icon className={`h-4 w-4 ${iconClass}`} />
                </span>
                <div>
                  <div className={styles.legendName}>{name}</div>
                  <div className={styles.legendDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.dialogFooter}>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
