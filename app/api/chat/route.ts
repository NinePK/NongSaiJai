// app/api/session/route.ts
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
type ReqBody = {
  message?: string;
  session_id?: string;         // sticky
  conversation_id?: string;     // optional (รองรับของเดิม)
  user_id?: string | null;
  meta?: any;
  history?: any[];
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ReqBody | null;

  if (!body?.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "N8N_WEBHOOK_URL missing" }, { status: 500 });
  }

  // ✅ Sticky session rule:
  // 1) ใช้ session_id ก่อน
  // 2) fallback conversation_id (ของเดิม)
  // 3) ไม่มีก็สร้างใหม่ครั้งเดียว
  const session_id =
    (typeof body.session_id === "string" && body.session_id.trim())
      ? body.session_id.trim()
      : (typeof body.conversation_id === "string" && body.conversation_id.trim())
        ? body.conversation_id.trim()
        : uuidv4();

  const payloadToN8n = {
    message: body.message,
    session_id,                   // ✅ ส่งตัวนี้ให้ n8n (สำคัญ)
    conversation_id: session_id,   // ✅ ทำให้เท่ากันไปเลย กันพลาด
    user_id: body.user_id ?? null,
    meta: body.meta ?? {},
    history: Array.isArray(body.history) ? body.history : [],
  };

  const n8nRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payloadToN8n),
  });

  const text = await n8nRes.text();

  if (!n8nRes.ok) {
    return NextResponse.json(
      { error: "n8n error", detail: text, session_id },
      { status: 500 }
    );
  }

  // n8n อาจตอบกลับเป็น json หรือ text
  let data: any = text;
  try { data = JSON.parse(text); } catch {}

  // ✅ ตอบ session_id กลับทุกครั้ง ให้ client เก็บ
  return NextResponse.json({
    session_id,
    ...((typeof data === "object" && data !== null) ? data : { reply: String(data) }),
  });
}
