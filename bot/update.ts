/**
 * Нормализованный вход бота: логика (bot/flow) не знает формата Telegram Update.
 * Только личные чаты; всё остальное — null (бот молча игнорирует).
 */
import type { Update } from "grammy/types";

export type From = { id: number; username: string | null; firstName: string | null };

type Base = { from: From; chatId: number; messageId: number; updateId?: number };

/** Bounded retry history, not a monotonic high-water mark: Telegram may randomize IDs after inactivity. */
export function rememberUpdate(history: unknown, id?: number): number[] {
  const ids = Array.isArray(history) ? history.filter(n => Number.isSafeInteger(n) && n >= 0) as number[] : [];
  return [...new Set(id === undefined ? ids : [...ids,id])].slice(-64);
}

export type BotUpdate =
  | (Base & { kind: "text"; text: string })
  | (Base & { kind: "command"; command: string; args: string })
  | (Base & { kind: "callback"; callbackId: string; data: string })
  | (Base & { kind: "location"; lat: number; lng: number })
  | (Base & { kind: "venue"; title: string; address: string; lat: number; lng: number })
  | (Base & { kind: "photo"; fileId: string })
  | (Base & { kind: "document"; fileId: string; fileName: string | null; mimeType: string | null; fileSize: number | null })
  | (Base & {
      kind: "audio";
      fileId: string;
      fileName: string | null;
      mimeType: string | null;
      fileSize: number | null;
      title: string | null;
      performer: string | null;
    })
  | (Base & { kind: "voice"; fileId: string })
  | (Base & { kind: "contact" })
  | (Base & { kind: "other" });

export type UpdateKind = BotUpdate["kind"];

export function normalizeUpdate(u: Update): BotUpdate | null {
  if (u.callback_query) {
    const q = u.callback_query;
    const chat = q.message?.chat;
    if (!chat || chat.type !== "private" || !q.message) return null;
    return {
      kind: "callback",
      updateId: u.update_id,
      from: toFrom(q.from),
      chatId: chat.id,
      messageId: q.message.message_id,
      callbackId: q.id,
      data: q.data ?? "",
    };
  }
  const m = u.message;
  if (!m || m.chat.type !== "private" || !m.from) return null;
  const base: Base = { from: toFrom(m.from), chatId: m.chat.id, messageId: m.message_id, updateId: u.update_id };

  if (typeof m.text === "string") {
    const cmd = /^\/([a-z0-9_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i.exec(m.text.trim());
    if (cmd) return { ...base, kind: "command", command: cmd[1].toLowerCase(), args: (cmd[2] ?? "").trim() };
    return { ...base, kind: "text", text: m.text };
  }
  if (m.venue) return {...base,kind:"venue",title:m.venue.title,address:m.venue.address,lat:m.venue.location.latitude,lng:m.venue.location.longitude};
  if (m.location) return { ...base, kind: "location", lat: m.location.latitude, lng: m.location.longitude };
  if (m.photo?.length) {
    const biggest = [...m.photo].sort((a, b) => b.width * b.height - a.width * a.height)[0];
    return { ...base, kind: "photo", fileId: biggest.file_id };
  }
  if (m.audio) {
    return {
      ...base,
      kind: "audio",
      fileId: m.audio.file_id,
      fileName: m.audio.file_name ?? null,
      mimeType: m.audio.mime_type ?? null,
      fileSize: m.audio.file_size ?? null,
      title: m.audio.title ?? null,
      performer: m.audio.performer ?? null,
    };
  }
  if (m.document) {
    return {
      ...base,
      kind: "document",
      fileId: m.document.file_id,
      fileName: m.document.file_name ?? null,
      mimeType: m.document.mime_type ?? null,
      fileSize: m.document.file_size ?? null,
    };
  }
  if (m.voice) return { ...base, kind: "voice", fileId: m.voice.file_id };
  if (m.contact) return { ...base, kind: "contact" };
  return { ...base, kind: "other" };
}

function toFrom(f: { id: number; username?: string; first_name?: string }): From {
  return { id: f.id, username: f.username ?? null, firstName: f.first_name ?? null };
}
