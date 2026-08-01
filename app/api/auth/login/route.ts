import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
  }
  const user = await login(email, password);
  if (!user) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
