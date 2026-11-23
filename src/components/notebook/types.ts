// Типы блокнота MINDLY — общий контракт клиента и стора

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  provider: string; // email | google | github
};

export type NoteAttachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  starred: boolean;
  trashed: boolean;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: NoteAttachment[];
};

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  _count?: { notes: number };
};

export type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  data: string; // текст содержимого либо data:URL для картинок
  noteId: string | null;
  createdAt: string;
};

// Вкладки сверху — как в браузере: заметки и вложения.
// Граф связей живёт отдельным разделом (кнопка «Граф»), вкладкой не является
export type TabKind = "note" | "attachment";

export type OpenTab = {
  key: string; // `${kind}:${id}`
  kind: TabKind;
  id: string;
  title: string;
};

// Режимы заметки: правка и чтение — два отдельных режима
export type EditorMode = "edit" | "read";

export type NewAttachmentInput = {
  name: string;
  mime: string;
  content: string;
  noteId?: string | null;
};
