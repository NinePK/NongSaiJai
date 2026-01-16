// app/api/mpsmart/issue-components/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const project_code = (searchParams.get("project_code") || "").trim();

  if (!project_code) {
    return NextResponse.json({ error: "project_code is required" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `
    select id, value, description
    from public.mpsmart_project_issue_components
    where project_code = $1
    order by value asc
    `,
    [project_code]
  );

  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const project_code = String(body?.project_code ?? "").trim();
  const value = String(body?.value ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const created_by = String(body?.created_by ?? "admin").trim(); // ปรับให้เป็น user จริงของคุณได้

  if (!project_code) return NextResponse.json({ error: "project_code is required" }, { status: 400 });
  if (!value) return NextResponse.json({ error: "value is required" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "description is required" }, { status: 400 });

  // กันซ้ำในระดับแอป (แนะนำให้เพิ่ม unique index ภายหลังถ้าต้องการ)
  const dup = await pool.query(
    `
    select id from public.mpsmart_project_issue_components
    where project_code = $1 and lower(value) = lower($2)
    limit 1
    `,
    [project_code, value]
  );
  if (dup.rowCount) {
    return NextResponse.json({ error: "Component title already exists" }, { status: 409 });
  }

  const { rows } = await pool.query(
    `
    insert into public.mpsmart_project_issue_components
      (project_code, value, description, created_by)
    values
      ($1, $2, $3, $4)
    returning id, value, description
    `,
    [project_code, value, description, created_by]
  );

  return NextResponse.json({ item: rows[0] });
}
