import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, publicUser } from "@/lib/auth";

// Текущая сессия: пользователь или null
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    return NextResponse.json({ ok: true, user: user ? publicUser(user) : null });
  } catch {
    return NextResponse.json({ ok: true, user: null });
  }
}
