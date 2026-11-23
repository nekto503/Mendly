import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// Удаление вложения
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });
  const { id } = await params;

  const existing = await db.attachment.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Вложение не найдено" }, { status: 404 });

  await db.attachment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
