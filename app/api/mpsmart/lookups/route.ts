import { NextResponse } from "next/server";
import { supabasePublicServer } from "@/lib/supabasePublicServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gname = searchParams.get("gname");

  if (!gname) {
    return NextResponse.json(
      { error: "gname is required" },
      { status: 400 }
    );
  }

  const supabase = supabasePublicServer();

  const { data, error } = await supabase
    .from("mpsmart_lookups")
    .select("id, value, description")
    .eq("gname", gname)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    items: data ?? [],
  });
}
