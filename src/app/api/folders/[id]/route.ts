import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// Переименование папки
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });
  const { id } = await params;

  const existing = await db.folder.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Папка не найдена" }, { status: 404 });

  try {
    const body = (await req.json()) as { name?: string };
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "У папки должно быть имя" }, { status: 400 });
    const folder = await db.folder.update({ where: { id }, data: { name } });
    return NextResponse.json({ ok: true, folder });
  } catch {
    return NextResponse.json({ ok: false, error: "Не удалось переименовать папку" }, { status: 500 });
  }
}

// Удаление папки вместе с вложенными папками; заметки остаются, но теряют папку
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "Нужен вход" }, { status: 401 });
  const { id } = await params;

  const existing = await db.folder.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Папка не найдена" }, { status: 404 });

  // Собираем всё поддерево: SQLite через Prisma не умеет рекурсивные CTE,
  // поэтому спускаемся уровнями сверху вниз — глубина папок конечна
  const all = await db.folder.findMany({ where: { userId: user.id }, select: { id: true, parentId: true } });
  const byParent = new Map<string | null, string[]>();
  for (const f of all) {
    const list = byParent.get(f.parentId) ?? [];
    list.push(f.id);
    byParent.set(f.parentId, list);
  }
  const toDelete: string[] = [id];
  for (let i = 0; i < toDelete.length; i++) {
    const children = byParent.get(toDelete[i]) ?? [];
    toDelete.push(...children);
  }

  // Заметки поддерева остаются, но отвязываются от удалённых папок
  await db.note.updateMany({
    where: { folderId: { in: toDelete }, userId: user.id },
    data: { folderId: null },
  });
  await db.folder.deleteMany({ where: { id: { in: toDelete }, userId: user.id } });

  return NextResponse.json({ ok: true });
}
