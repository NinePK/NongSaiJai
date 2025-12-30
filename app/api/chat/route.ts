import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body?.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "N8N_WEBHOOK_URL missing" }, { status: 500 });
  }

  const payload = {
    conversation_id: body.conversation_id ?? null,
    user_id: body.user_id ?? null,
    message: body.message,
    history: Array.isArray(body.history) ? (body.history as ChatMessage[]) : [],
    meta: body.meta ?? { tz: "Asia/Bangkok", client: "nextjs" },
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { reply: text };
  }

  return NextResponse.json(
    {
      reply: data.reply ?? data.message ?? data.output ?? "",
      should_summarize: !!data.should_summarize,
      summary: data.summary ?? null,
      advice: data.advice ?? null,
      raw: data,
    },
    { status: res.ok ? 200 : res.status }
  );
}
