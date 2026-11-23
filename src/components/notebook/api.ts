// Тонкий клиент API блокнота: все ошибки превращаются в понятные русские сообщения

import type { Attachment, Folder, Note, NewAttachmentInput, PublicUser } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new Error("Нет связи с сервером — проверь интернет");
  }
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* пустой ответ — обработаем ниже */
  }
  if (!res.ok || data.ok === false) {
    throw new Error((data.error as string) ?? "Что-то пошло не так — попробуй ещё раз");
  }
  return data as T;
}

/* ---------- сессия ---------- */

export async function fetchMe(): Promise<PublicUser | null> {
  const data = await request<{ user: PublicUser | null }>("/api/auth/me");
  return data.user ?? null;
}

export async function apiLogout() {
  await request("/api/auth/logout", { method: "POST" });
}

/* ---------- заметки ---------- */

export async function fetchNotes(): Promise<Note[]> {
  const data = await request<{ notes: Note[] }>("/api/notes");
  return data.notes;
}

export async function createNoteRequest(
  title: string,
  folderId: string | null,
  extra?: { content?: string; starred?: boolean }
): Promise<Note> {
  const data = await request<{ note: Note }>("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title, folderId, ...(extra ?? {}) }),
  });
  return data.note;
}

export async function patchNote(id: string, patch: Partial<Note>): Promise<Note> {
  const data = await request<{ note: Note }>(`/api/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data.note;
}

export async function deleteNoteRequest(id: string) {
  await request(`/api/notes/${id}`, { method: "DELETE" });
}

/* ---------- папки ---------- */

export async function fetchFolders(): Promise<Folder[]> {
  const data = await request<{ folders: Folder[] }>("/api/folders");
  return data.folders;
}

export async function createFolderRequest(name: string, parentId: string | null = null): Promise<Folder> {
  const data = await request<{ folder: Folder }>("/api/folders", {
    method: "POST",
    body: JSON.stringify({ name, parentId }),
  });
  return data.folder;
}

export async function patchFolderRequest(id: string, name: string): Promise<Folder> {
  const data = await request<{ folder: Folder }>(`/api/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return data.folder;
}

export async function deleteFolderRequest(id: string) {
  await request(`/api/folders/${id}`, { method: "DELETE" });
}

/* ---------- вложения ---------- */

export async function fetchAttachments(): Promise<Attachment[]> {
  const data = await request<{ attachments: Attachment[] }>("/api/attachments");
  return data.attachments;
}

export async function createAttachmentRequest(input: NewAttachmentInput): Promise<Attachment> {
  const data = await request<{ attachment: Attachment }>("/api/attachments", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.attachment;
}

export async function deleteAttachmentRequest(id: string) {
  await request(`/api/attachments/${id}`, { method: "DELETE" });
}
