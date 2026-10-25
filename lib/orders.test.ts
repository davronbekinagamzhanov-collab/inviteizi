import { describe, expect, it } from "vitest";
import { computeExpiresAt, invitationData, pageMode } from "./orders";
import type { InvitationData, OrderRecord } from "./domain";

const data: InvitationData = {
  occasion: "nikoh",
  groom: "Азиз",
  bride: "Мадина",
  hosts: "Каримовлар оиласи",
  events: [
    { kind: "nahorgi", date: "2026-12-12", time: "06:00", venueName: "Уй", address: "" },
    { kind: "kelinSalom", date: "2026-12-14", time: "09:00", venueName: "Уй", address: "" },
    { kind: "nikohBazm", date: "2026-12-13", time: "18:00", venueName: "Тўйхона", address: "" },
  ],
};

function order(over: Partial<OrderRecord> = {}): OrderRecord {
  const t = new Date("2026-11-01T10:00:00Z");
  return {
    id: "00000000-0000-4000-8000-000000000001",
    number: 101,
    userId: 1,
    status: "active",
    occasion: "nikoh",
    format: "animated",
    templateId: "ganch-peshtoq",
    data,
    music: { kind: "none" },
    slug: "aziz-madina",
    amount: 10_000,
    receipt: null,
    rejectReason: null,
    createdAt: t,
    updatedAt: t,
    receiptAt: null,
    paidAt: null,
    paymentRemindedAt: null,
    adminRemindedAt: null,
    expiresAt: null,
    ...over,
  };
}

describe("computeExpiresAt — последний тадбир + 30 дней", () => {
  it("берёт самый поздний день (не последний в списке), конец дня по Казахстану", () => {
    expect(computeExpiresAt(data.events)?.toISOString()).toBe("2027-01-13T18:59:59.000Z");
  });

  it("нет тадбиров — нет срока", () => {
    expect(computeExpiresAt([])).toBeNull();
  });
});

describe("pageMode", () => {
  const before = new Date("2026-12-20T00:00:00Z");
  const after = new Date("2027-01-14T00:00:00Z");

  it("active → полная версия", () => {
    expect(pageMode(order({ status: "active" }), before)).toBe("full");
  });

  it("до подтверждения оплаты (и после отказа) → НАМУНА", () => {
    for (const status of ["draft", "preview", "awaiting_payment", "receipt_sent", "rejected"] as const) {
      expect(pageMode(order({ status }), new Date("2026-11-01T20:00:00Z"))).toBe("demo");
    }
  });

  it("archived → заглушка", () => {
    expect(pageMode(order({ status: "archived" }), before)).toBe("expired");
  });

  it("демо истекает ровно через 24 часа; правка не продлевает, оплата восстанавливает", () => {
    const o = order({ status: "preview" });
    const deadline = new Date(o.createdAt.getTime() + 86400000);
    expect(pageMode(o, new Date(+deadline - 1))).toBe("demo");
    expect(pageMode({ ...o, updatedAt: deadline }, deadline)).toBe("expired");
    expect(pageMode({ ...o, status: "active", paidAt: deadline }, deadline)).toBe("full");
  });

  it("после срока → заглушка (срок из заказа или по тадбирам)", () => {
    expect(pageMode(order(), after)).toBe("expired");
    expect(pageMode(order({ expiresAt: new Date("2026-12-15T00:00:00Z") }), before)).toBe("expired");
    expect(pageMode(order({ expiresAt: new Date("2027-06-01T00:00:00Z") }), after)).toBe("full");
  });
});

describe("invitationData — музыка заказа для шаблона", () => {
  it("из списка → адрес файла трека", () => {
    const d = invitationData(order({ music: { kind: "list", musicId: "yor-yor" } }), "https://x/yor-yor.mp3");
    expect(d.musicUrl).toBe("https://x/yor-yor.mp3");
    expect(d.noMusic).toBeUndefined();
  });

  it("своя песня → файл, скопированный в бакет music", () => {
    const d = invitationData(order({ music: { kind: "own", fileId: "F", url: "https://x/own.mp3" } }));
    expect(d.musicUrl).toBe("https://x/own.mp3");
  });

  it("без музыки → noMusic", () => {
    const d = invitationData(order({ music: { kind: "none" } }));
    expect(d.noMusic).toBe(true);
    expect(d.musicUrl).toBeUndefined();
  });
  it("missing historical track never plays a different template melody instead", () => {
    expect(invitationData(order({ music: { kind: "list", musicId: "missing" } })).noMusic).toBe(true);
    expect(invitationData(order({ music: { kind: "own", fileId: "old" } })).noMusic).toBe(true);
  });

  it("остальные данные не меняются", () => {
    const d = invitationData(order());
    expect(d.groom).toBe("Азиз");
    expect(d.events).toHaveLength(3);
  });
});
