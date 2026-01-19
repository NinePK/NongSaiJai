"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SaveOverlay } from "./SaveOverlay"; // ✅ ถ้า SaveOverlay อยู่ที่อื่น ปรับ path ให้ถูก

type SaveState = "idle" | "saving" | "success" | "error";
type OverlayState = "saving" | "success" | "error";

export function ProjCodeEditor({
  sessionId,
  initialProjCode,
  onUpdated,
}: {
  sessionId: string;
  initialProjCode: string | null;
  onUpdated?: (next: string | null) => void;
}) {
  const router = useRouter();

  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(initialProjCode ?? "");

  const [saving, setSaving] = React.useState(false);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [saveMsg, setSaveMsg] = React.useState("");

  React.useEffect(() => {
    setValue(initialProjCode ?? "");
  }, [initialProjCode]);

  const overlayState: OverlayState =
    saveState === "idle" ? "saving" : saveState;

  const overlayNode =
    saveState !== "idle"
      ? createPortal(
          <SaveOverlay
            open
            state={overlayState}
            title={
              saveState === "saving"
                ? "กำลังบันทึก Project Code..."
                : saveState === "success"
                ? "บันทึกสำเร็จ"
                : "บันทึกไม่สำเร็จ"
            }
            message={
              saveState === "saving"
                ? "โปรดรอสักครู่"
                : saveMsg || "กรุณาลองใหม่อีกครั้ง"
            }
          />,
          document.body
        )
      : null;

  const fail = (msg: string) => {
    setSaveMsg(msg);
    setSaveState("error");
    window.setTimeout(() => setSaveState("idle"), 1200);
  };

  const doSave = async (next: string | null) => {
    setSaving(true);
    setSaveMsg("");
    setSaveState("saving");

    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/proj-code`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proj_code: next }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Update failed");

      const nextVal = (j?.session?.proj_code ?? next) as string | null;

      // ✅ 1) Optimistic UI: อัปเดตทันที
      onUpdated?.(nextVal);

      // ✅ 2) Sync ทั้งหน้าให้ตรง DB (Server Components)
      router.refresh();

      setSaveState("success");
      setSaveMsg("อัปเดต Project Code เรียบร้อยแล้ว");

      window.setTimeout(() => {
        setSaveState("idle");
        setEditing(false);
      }, 900);
    } catch (e: any) {
      setSaveState("error");
      setSaveMsg(e?.message ?? "Save error");
      window.setTimeout(() => setSaveState("idle"), 1400);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {overlayNode}

      {!editing ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={saving}
            style={{
              border: "1px solid var(--border)",
              background: "var(--card2)",
              padding: "8px 12px",
              borderRadius: 10,
              fontWeight: 900,
            }}
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => {
              if (!confirm("ต้องการลบ Project Code (ตั้งเป็นว่าง) ใช่ไหม?")) return;
              doSave(null);
            }}
            disabled={saving}
            style={{
              border: "1px solid rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.12)",
              padding: "8px 12px",
              borderRadius: 10,
              fontWeight: 900,
            }}
          >
            Clear
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="เช่น ENT260001"
            disabled={saving}
            style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              fontWeight: 900,
              minWidth: 220,
            }}
          />

          <button
            type="button"
            onClick={() => {
              const next = value.trim();
              if (!next) return fail("กรุณากรอก Project Code หรือกด Clear");
              doSave(next);
            }}
            disabled={saving}
            style={{
              border: "1px solid rgba(59,130,246,0.35)",
              background: "rgba(59,130,246,0.14)",
              padding: "8px 12px",
              borderRadius: 10,
              fontWeight: 900,
            }}
          >
            Save
          </button>

          <button
            type="button"
            onClick={() => {
              setValue(initialProjCode ?? "");
              setEditing(false);
            }}
            disabled={saving}
            style={{
              border: "1px solid var(--border)",
              background: "transparent",
              padding: "8px 12px",
              borderRadius: 10,
              fontWeight: 900,
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
