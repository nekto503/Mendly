import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// Одна заметка — проверяем владение
export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });
  const { id } = await params;
  const note = await db.note.findFirst({
    where: { id, userId: user.id },
    include: { attachments: { select: { id: true, name: true, mime: true, size: true } } },
  });
  if (!note) return NextResponse.json({ ok: false, error: "Заметка не найдена" }, { status: 404 });
  return NextResponse.json({ ok: true, note });
}

// Частичное обновление: заголовок, содержимое, папка, флажки
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });
  const { id } = await params;

  const existing = await db.note.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Заметка не найдена" }, { status: 404 });

  try {
    const body = (await req.json()) as {
      title?: string;
      content?: string;
      folderId?: string | null;
      starred?: boolean;
      trashed?: boolean;
    };
    const data: Record<string, unknown> = {};
    if (typeof body.title === "string") data.title = body.title.trim() || "Без названия";
    if (typeof body.content === "string") data.content = body.content;
    if (body.folderId === null || typeof body.folderId === "string") {
      if (body.folderId) {
        const folder = await db.folder.findFirst({ where: { id: body.folderId, userId: user.id } });
        if (!folder) return NextResponse.json({ ok: false, error: "Папка не найдена" }, { status: 404 });
      }
      data.folderId = body.folderId ?? null;
    }
    if (typeof body.starred === "boolean") data.starred = body.starred;
    if (typeof body.trashed === "boolean") data.trashed = body.trashed;

    const note = await db.note.update({
      where: { id },
      data,
      include: { attachments: { select: { id: true, name: true, mime: true, size: true } } },
    });
    return NextResponse.json({ ok: true, note });
  } catch {
    return NextResponse.json({ ok: false, error: "Не удалось сохранить заметку" }, { status: 500 });
  }
}

// Удаление навсегда: вместе с привязанными вложениями
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });
  const { id } = await params;

  const existing = await db.note.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Заметка не найдена" }, { status: 404 });

  await db.attachment.deleteMany({ where: { noteId: id, userId: user.id } });
  await db.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
