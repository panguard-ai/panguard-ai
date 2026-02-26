import { NextResponse } from "next/server";
import { appendToSheet } from "@/lib/sheets";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    await appendToSheet("waitlist", [
      new Date().toISOString(),
      email,
      "early-access",
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
