import type { Repo } from "../repo";
import type { Tg } from "../tg";
import type { BotUpdate } from "../update";
import type { Format, InvitationData, InvitationEvent, Lang, MusicChoice, Occasion, UserRecord } from "@/lib/domain";
import type { BotTexts } from "@/texts/bot-uz";

export type BotEnv = {
  ownerUsername: string;
  kaspiPhone: string;
  kaspiName: string;
  /** https://inviteizi.vercel.app (без «/» в конце) */
  publicBaseUrl: string;
};

export type Deps = {
  repo: Repo;
  tg: Tg;
  env: BotEnv;
  now: () => Date;
  /** Скопировать песню клиента из Telegram в Storage (бакет music); вернуть публичный адрес */
  saveMusic?: (fileId: string, userId: number) => Promise<string | undefined>;
};

/** Шаги анкеты (users.step) */
export type StepId =
  | "idle"
  | "cat"
  | "fmt"
  | "catalog"
  | "groom"
  | "bride"
  | "relation"
  | "person"
  | "cause"
  | "age"
  | "hosts"
  | "sideAsk"
  | "sideBride"
  | "evDate"
  | "evSameDay"
  | "evTime"
  | "evTimeCustom"
  | "evVenue"
  | "evAddress"
  | "evLoc"
  | "more"
  | "text"
  | "textOwn"
  | "music"
  | "musicList"
  | "musicOwn"
  | "review"
  | "evMenu"
  | "receipt";

/** Данные анкеты по ходу заполнения (тадбиры могут быть недозаполнены) */
export type DraftData = Omit<Partial<InvitationData>, "events"> & { events?: Partial<InvitationEvent>[] };

/** Куда вернуться по «Назад» */
export type BackEntry = { step: StepId; ev?: number; ret?: "review" };

/** Черновик заказа и положение в диалоге (users.state) */
export type Draft = {
  handledUpdates?: number[];
  /** Номер вопроса: кнопки старых вопросов не срабатывают */
  q?: number;
  back?: BackEntry[];
  /** Глубина стека «Назад» на первой сводке */
  reviewDepth?: number;
  /** Правка из сводки: после ответа вернуться к ней */
  ret?: "review";
  occasion?: Occasion;
  format?: Format;
  templateId?: string;
  catIdx?: number;
  /** Страница вариантов текста (по 3) */
  textPage?: number;
  data?: DraftData;
  /** Индекс тадбира, который сейчас заполняется */
  ev?: number;
  calMonth?: string;
  music?: MusicChoice;
  /** Правка существующего заказа / оплата / смена ссылки */
  orderId?: string;
  /** Заказ уже оплачен: формат (и цену) менять нельзя */
  paid?: boolean;
};

export type Ctx = {
  deps: Deps;
  u: BotUpdate;
  user: UserRecord;
  lang: Lang;
  tx: BotTexts;
  chatId: number;
  step: StepId;
  s: Draft;
  /** callback уже получил ответ */
  answered: boolean;
  /** Номер последнего вопроса до этого обновления (черновик могут заменить целиком) */
  q0: number;
};

/** Итог обработки ответа на шаге */
export type Result =
  | { ignore: true } // persistence already committed, or another request consumed this answer
  | { to: StepId } // ответ принят — следующий вопрос
  | { enter: StepId } // начать с этого вопроса заново (стек «Назад» пустой)
  | { wait: StepId } // перейти на шаг молча: вопрос уже показан (реквизиты оплаты → ждём чек)
  | { done: true } // диалог закончен: шаг idle, черновик очищен
  | { stay: true } // ответ принят, вопрос тот же (листание каталога, календаря)
  | { hint: string } // ответ не подошёл — подсказка и повтор вопроса
  | null; // непонятный ввод — общая подсказка и повтор

export type Step = {
  ask(c: Ctx): Promise<void>;
  /** Нажата кнопка этого вопроса (value — после «a:<q>:») */
  onButton?(c: Ctx, value: string): Promise<Result>;
  /** Пришло сообщение (текст, локация, файл…) */
  onMessage?(c: Ctx): Promise<Result>;
  /** Вопрос показан с reply-клавиатурой (локация) — при уходе вернуть меню */
  replyKeyboard?: boolean;
};
