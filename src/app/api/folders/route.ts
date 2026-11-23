import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// Папки пользователя со счётчиком заметок (вложенность произвольной глубины)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });

  const folders = await db.folder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { notes: true } } },
  });
  return NextResponse.json({ ok: true, folders });
}

// Новая папка — в корне или внутри другой папки
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });

  try {
    const body = (await req.json()) as { name?: string; parentId?: string | null };
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "У папки должно быть имя" }, { status: 400 });
    if (name.length > 60) {
      return NextResponse.json({ ok: false, error: "Слишком длинное имя папки" }, { status: 400 });
    }

    // Родитель должен существовать и принадлежать пользователю
    let parentId: string | null = null;
    if (body.parentId) {
      const parent = await db.folder.findFirst({
        where: { id: body.parentId, userId: user.id },
      });
      if (!parent) return NextResponse.json({ ok: false, error: "Родительская папка не найдена" }, { status: 404 });
      parentId = parent.id;
    }

    const folder = await db.folder.create({ data: { name, parentId, userId: user.id } });
    return NextResponse.json({ ok: true, folder });
  } catch {
    return NextResponse.json({ ok: false, error: "Не удалось создать папку" }, { status: 500 });
  }
}
