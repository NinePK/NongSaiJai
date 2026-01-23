import ChatWidget from "@/components/chat/ChatWidget";

export default function Page() {
  return (
    <main className="portal-theme portal-bg relative min-h-screen overflow-hidden">
      {/* Hero / Intro */}
      <section
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "96px 24px 48px",
        }}
      >
        <h1
          style={{
            fontSize: 36,
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: 18,
            color: "var(--text-strong)",
          }}
        >
          น้องใส่ใจ (NongSaiJai)
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            color: "var(--text-muted)",
            marginBottom: 28,
          }}
        >
          น้องใส่ใจ คือ AI Chatbot สำหรับรับฟัง สะท้อน และช่วยกลั่นกรองปัญหาการทำงาน
          เพื่อสนับสนุนการบริหารความเสี่ยงและการตัดสินใจขององค์กร
        </p>

        <ul
          style={{
            paddingLeft: 18,
            color: "var(--text)",
            lineHeight: 1.8,
            fontSize: 16,
          }}
        >
          <li>รับฟังและสรุปประเด็นจากบทสนทนา</li>
          <li>ช่วยแยกแยะสถานะ <b>Infomational-No RISK / CONCERN / RISK / ISSUE</b></li>
          <li>สนับสนุนผู้ดูแลระบบในการตัดสินใจ ไม่ใช่ผู้ตัดสินแทนมนุษย์</li>
        </ul>

        <div
          style={{
            marginTop: 36,
            padding: "18px 20px",
            borderRadius: 14,
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#e5e7eb",
            fontSize: 14,
          }}
        >
          💬 เริ่มต้นใช้งานได้ทันที โดยคลิกปุ่มแชทที่มุมขวาล่างของหน้าจอ
        </div>
      </section>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </main>
  );
}
