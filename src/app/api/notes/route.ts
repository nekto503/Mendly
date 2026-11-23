import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// Список всех заметок пользователя (включая корзину — клиент фильтрует сам)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });

  const notes = await db.note.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { attachments: { select: { id: true, name: true, mime: true, size: true } } },
  });
  return NextResponse.json({ ok: true, notes });
}

// Создание заметки — в том числе копией существующей (с содержимым)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });

  try {
    const body = (await req.json()) as {
      title?: string;
      folderId?: string | null;
      content?: string;
      starred?: boolean;
    };
    const title = (body.title ?? "").trim() || "Без названия";
    if (body.folderId) {
      const folder = await db.folder.findFirst({ where: { id: body.folderId, userId: user.id } });
      if (!folder) return NextResponse.json({ ok: false, error: "Папка не найдена" }, { status: 404 });
    }
    const note = await db.note.create({
      data: {
        title,
        content: typeof body.content === "string" ? body.content : "",
        starred: body.starred === true,
        userId: user.id,
        folderId: body.folderId ?? null,
      },
      include: { attachments: { select: { id: true, name: true, mime: true, size: true } } },
    });
    return NextResponse.json({ ok: true, note });
  } catch {
    return NextResponse.json({ ok: false, error: "Не удалось создать заметку" }, { status: 500 });
  }
}
