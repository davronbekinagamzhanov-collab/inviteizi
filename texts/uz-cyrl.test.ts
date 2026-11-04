import { describe, expect, it } from "vitest";
import { t as glued, tPlain as t } from "./uz-cyrl";
import { longSamples, samples } from "@/lib/samples";
import type { InvitationData, Occasion } from "@/lib/types";

const occasions: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];
// Латинская буква внутри кириллического слова («косa») — опечатка, которую глазом не видно
const MIXED = /[а-яёўқғҳ][a-z]|[a-z][а-яёўқғҳ]/i;

describe("тексты приглашений", () => {
  for (const o of occasions) {
    it(`${o}: 8 разных вариантов, без пустых мест и смеси алфавитов`, () => {
      for (const d of [samples[o], longSamples[o]] as InvitationData[]) {
        const list = t.inviteOptions(d);
        expect(list).toHaveLength(8);
        expect(new Set(list.map((x) => x.id)).size).toBe(8);
        expect(new Set(list.map((x) => x.body)).size).toBe(8);
        for (const x of list) {
          const all = `${x.greeting} ${x.body}`;
          expect(all, x.id).not.toMatch(/undefined|null|NaN|\s{2,}|\s[.,!]/);
          expect(all, x.id).not.toMatch(MIXED);
          expect(x.body.length, x.id).toBeLessThanOrEqual(600);
        }
      }
    });
  }

  it("на странице «ва» и «билан» не отрываются: тексты приглашения склеены неразрывным пробелом", () => {
    expect(glued.inviteOptions(samples.nikoh)[0].body).toContain("Азиз ва Мадинанинг");
    expect(JSON.stringify(glued)).not.toMatch(/(^|[\s"])ва /);
  });

  it("имена подставлены в нужном падеже", () => {
    const nikoh = t.inviteOptions(samples.nikoh);
    expect(nikoh[0].body).toContain("Азиз ва Мадинанинг");
    expect(nikoh.find((x) => x.id === "young")?.body).toContain("Биз — Азиз ва Мадина —");
    expect(t.inviteOptions(samples.nahorgi).find((x) => x.id === "warm")?.body).toContain("никоҳ тўйини");
    // два мальчика — множественное число
    expect(t.inviteOptions(longSamples.sunnat)[0].body).toContain("набираларимиз Абдураҳмонжон ва Абдуллоҳжоннинг");
  });

  it("«ўзимизники»: без «фарзандларимиз»", () => {
    const own = t.inviteOptions({ ...samples.nikoh, relation: "ozimiz" });
    for (const x of own) expect(x.body).not.toMatch(/фарзанд/);
  });
});
