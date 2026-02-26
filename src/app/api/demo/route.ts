import { NextResponse } from "next/server";
import { appendToSheet } from "@/lib/sheets";

export async function POST(req: Request) {
  try {
    const { name, email, company, teamSize, stack, message } = await req.json();

    if (!name || !email || !company) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await appendToSheet("demo", [
      new Date().toISOString(),
      name,
      email,
      company,
      teamSize || "",
      stack || "",
      message || "",
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
