"use client";

import * as React from "react";
import { ProjCodeEditor } from "./ProjCodeEditor";

export function ProjCodeBlock({
  sessionId,
  initialProjCode,
}: {
  sessionId: string;
  initialProjCode: string | null;
}) {
  // ✅ Optimistic UI state
  const [projCode, setProjCode] = React.useState<string | null>(initialProjCode);

  // ✅ ถ้า server refresh แล้วส่งค่าใหม่เข้ามา ให้ sync กับ state
  React.useEffect(() => {
    setProjCode(initialProjCode);
  }, [initialProjCode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontWeight: 800 }}>
        Project Code:{" "}
        <span style={{ fontWeight: 900 }}>{projCode || "-"}</span>
      </div>

      <ProjCodeEditor
        sessionId={sessionId}
        initialProjCode={projCode}
        onUpdated={(next) => setProjCode(next)} // ✅ เปลี่ยนทันที ไม่ต้องรีเฟรช
      />
    </div>
  );
}
