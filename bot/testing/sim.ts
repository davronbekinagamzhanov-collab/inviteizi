/**
 * Симулятор переписки для сценарных тестов: клиент «пишет» и «жмёт кнопки»,
 * бот отвечает через FakeTg, данные — в MemoryRepo, часы — управляемые.
 */
import { MemoryRepo } from "../repo-memory";
import { handle } from "../flow";
import type { BotEnv, Deps } from "../flow/types";
import type { BotUpdate, From } from "../update";
import type { MusicRecord } from "@/lib/domain";
import { FakeTg, inlineButtons, type FakeMessage } from "./fake-tg";

export const ADMIN = 500;
export const ADMIN2 = 501;

export const testEnv: BotEnv = {
  ownerUsername: "inviteizi_owner",
  kaspiPhone: "+7 700 000 00 00",
  kaspiName: "Давронбек И.",
  publicBaseUrl: "https://inviteizi.vercel.app",
};

export const testMusic: MusicRecord[] = [
  { id: "yor-yor", titleUz: "Ёр-ёр", titleRu: "Ёр-ёр", fileUrl: "https://cdn.test/music/yor-yor.mp3", telegramFileId: null, sort: 1 },
  { id: "kelin-salom", titleUz: "Келин салом", titleRu: "Келин салом", fileUrl: "https://cdn.test/music/kelin-salom.mp3", telegramFileId: null, sort: 2 },
];

type Match = string | RegExp;
const matches = (label: string, m: Match) => (typeof m === "string" ? label === m : m.test(label));

export class Sim {
  tg = new FakeTg();
  clock: Date;
  repo: MemoryRepo;
  deps: Deps;
  savedMusic: string[] = [];
  private nextMsg = 1;
  private nextCb = 1;

  constructor(opts: { now?: string; admins?: number[]; music?: MusicRecord[] } = {}) {
    this.clock = new Date(opts.now ?? "2026-11-01T07:00:00Z"); // 12:00 в Сайраме
    this.repo = new MemoryRepo({ ownerId: ADMIN, analyticsAdminIds: [ADMIN2], adminIds: opts.admins ?? [ADMIN, ADMIN2], music: opts.music ?? testMusic, now: () => this.clock });
    this.deps = {
      repo: this.repo,
      tg: this.tg,
      env: testEnv,
      now: () => this.clock,
      saveMusic: async (fileId) => {
        this.savedMusic.push(fileId);
        return `https://cdn.test/music/own/${fileId}.mp3`;
      },
    };
  }

  /** Сдвинуть часы вперёд на минуты */
  advance(minutes: number) {
    this.clock = new Date(this.clock.getTime() + minutes * 60_000);
  }

  from(id: number): From {
    return { id, username: `user${id}`, firstName: `Клиент${id}` };
  }

  private base(id: number) {
    return { from: this.from(id), chatId: id, messageId: this.nextMsg++ };
  }

  async send(u: BotUpdate) {
    await handle(this.deps, u);
  }

  async command(id: number, command: string, args = "") {
    await this.send({ ...this.base(id), kind: "command", command, args });
  }

  async start(id: number, payload = "") {
    await this.command(id, "start", payload);
  }

  async text(id: number, text: string) {
    await this.send({ ...this.base(id), kind: "text", text });
  }

  async location(id: number, lat: number, lng: number) {
    await this.send({ ...this.base(id), kind: "location", lat, lng });
  }

  async photo(id: number, fileId = "RECEIPT_PHOTO") {
    await this.send({ ...this.base(id), kind: "photo", fileId });
  }

  async document(id: number, fileId: string, mimeType: string, fileName: string, fileSize = 100_000) {
    await this.send({ ...this.base(id), kind: "document", fileId, mimeType, fileName, fileSize });
  }

  async audio(id: number, fileId: string, fileSize: number, title = "Тўй қўшиғи") {
    await this.send({
      ...this.base(id),
      kind: "audio",
      fileId,
      fileSize,
      title,
      performer: null,
      fileName: `${title}.mp3`,
      mimeType: "audio/mpeg",
    });
  }

  async voice(id: number) {
    await this.send({ ...this.base(id), kind: "voice", fileId: "VOICE" });
  }

  async sticker(id: number) {
    await this.send({ ...this.base(id), kind: "other" });
  }

  /** Самое свежее сообщение пользователю, у которого есть кнопка с такой подписью */
  findButton(id: number, label: Match): { msg: FakeMessage; data: string } {
    const list = this.tg.to(id);
    for (let i = list.length - 1; i >= 0; i--) {
      const b = inlineButtons(list[i]).find((x) => matches(x.text, label));
      if (b) {
        if (!("data" in b)) throw new Error(`Кнопка «${b.text}» — не callback`);
        return { msg: list[i], data: b.data };
      }
    }
    throw new Error(`Нет кнопки ${String(label)} у ${id}. Последнее: ${this.lastText(id)}`);
  }

  /** Нажать inline-кнопку (по подписи) в последнем сообщении, где она есть */
  async click(id: number, label: Match, as = id) {
    const { msg, data } = this.findButton(id, label);
    await this.callback(as, data, msg.id, id);
  }

  /** callback с произвольными данными (as — кто нажал, chat — где сообщение) */
  async callback(as: number, data: string, messageId: number, chat = as) {
    await this.send({ from: this.from(as), chatId: chat, messageId, kind: "callback", callbackId: `cb${this.nextCb++}`, data });
  }

  last(id: number) {
    return this.tg.last(id);
  }

  lastText(id: number) {
    return this.tg.last(id)?.text ?? "";
  }

  /** Тексты всех сообщений пользователю после отметки */
  textsSince(id: number, mark: number) {
    return this.tg.to(id).filter((m) => m.id >= mark).map((m) => m.text);
  }

  /** Отметка «с этого момента» */
  mark() {
    return this.tg.messages.length ? this.tg.messages[this.tg.messages.length - 1].id + 1 : 0;
  }

  async user(id: number) {
    return this.repo.getUser(id);
  }
}
