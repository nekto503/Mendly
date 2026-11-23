import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// Вложения пользователя: текст, код или картинка (dataURL)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });

  const attachments = await db.attachment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, attachments });
}

// Новое вложение (лимит 400 КБ — картинки хранятся как dataURL)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });

  try {
    const body = (await req.json()) as { name?: string; mime?: string; content?: string; noteId?: string | null };
    const name = (body.name ?? "").trim();
    const mime = (body.mime ?? "text/plain").trim() || "text/plain";
    const content = body.content ?? "";

    if (!name) return NextResponse.json({ ok: false, error: "У вложения должно быть имя" }, { status: 400 });
    if (content.length > 400 * 1024) {
      return NextResponse.json({ ok: false, error: "Файл больше 400 КБ — прикрепи поменьше" }, { status: 400 });
    }
    if (mime.startsWith("image/") && !content.startsWith("data:")) {
      return NextResponse.json({ ok: false, error: "Картинка должна приходить как dataURL" }, { status: 400 });
    }
    if (body.noteId) {
      const note = await db.note.findFirst({ where: { id: body.noteId, userId: user.id } });
      if (!note) return NextResponse.json({ ok: false, error: "Заметка не найдена" }, { status: 404 });
    }

    const attachment = await db.attachment.create({
      data: {
        name,
        mime,
        data: content, // в базе поле называется data: текст или data:URL
        size: content.length,
        noteId: body.noteId ?? null,
        userId: user.id,
      },
    });
    return NextResponse.json({ ok: true, attachment });
  } catch {
    return NextResponse.json({ ok: false, error: "Не удалось сохранить вложение" }, { status: 500 });
  }
}
