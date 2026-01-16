// app/api/mpsmart/project-pms/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectCode = searchParams.get("project_code");

  if (!projectCode) {
    return NextResponse.json(
      { error: "project_code is required" },
      { status: 400 }
    );
  }

  try {
    const { rows } = await pool.query(
  `
  with p as (
    select pm_code
    from public.pf_draft_projects
    where proj_code = $1
    order by last_modified desc nulls last, id desc
    limit 1
  ),
  pm as (
    select distinct on (pt.user_code)
      pt.id,
      pt.user_code,
      pt.t_role_title
    from public.pm_teams pt
    join p on p.pm_code = pt.user_code
    order by pt.user_code, pt.id desc
  )
  select
    pm.id as id,
    pm.user_code,
    me.name_en as display_name,
    coalesce(pm.t_role_title, 'Project Manager') as role_title
  from pm
  left join public.master_employees me
    on me.code = pm.user_code
  order by pm.id desc
  `,
  [projectCode]
);


    return NextResponse.json({ items: rows ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "DB error" },
      { status: 500 }
    );
  }
}
