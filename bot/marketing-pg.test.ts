import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
/** Native, isolated PostgreSQL only. No DATABASE_URL or production credentials are read. */
import { beforeAll, afterAll, it, expect, vi } from "vitest";
import postgres from "postgres";
import { readFile, writeFile } from "node:fs/promises";
import { PgRepo } from "./repo-pg";
import { designs, PRICES, getDesign } from "@/templates/registry";
import { discounted } from "@/lib/pricing-math";
import { computeExpiresAt } from "@/lib/orders";
import type { Sql } from "@/lib/db";
vi.mock("next/font/local", () => ({ default: () => ({ variable: "fixture-font" }) }));
const native = process.env.MARKETING_LOCAL_PG === "1";
let sql: Sql,
  root: Sql,
  repo: PgRepo,
  n = 200000;
const timings: unknown[] = [];
const opts = {
  host: "127.0.0.1",
  port: 55437,
  username: userInfo().username,
  database: "inviteizi_task7",
  ssl: false as const,
  prepare: false,
  onnotice: () => {},
  types: { bigint: { to: 20, from: [20], serialize: String, parse: Number } },
};
const flags = { referrals: true, status: true, edits: true };
beforeAll(async () => {
  if (!native) return;
  vi.stubEnv("ADMIN_IDS", "500");
  vi.stubEnv("OWNER_TELEGRAM_ID", "500");
  root = postgres({ ...opts, max: 1 });
  expect((await root`select current_database() as db`)[0].db).toBe("inviteizi_task7");
  expect((await root`select current_setting('inviteizi.local_fixture',true) as marker`)[0].marker).toBe("on");
  await root`truncate public.users,public.orders,public.partners,public.promotion_codes,public.analytics_events,public.bot_notices,public.marketing_audit,public.slug_history restart identity cascade`;
  await root.unsafe(await readFile("supabase/migrations/20261115130000_marketing_automation.sql", "utf8"));
  await root.unsafe(await readFile("supabase/migrations/20261115130000_marketing_automation.sql", "utf8"));
  for (const d of designs)
    await root`insert into public.templates(id,number,occasion,format,price) values(${d.id},${d.number},${d.occasion},${d.format},${PRICES[d.format]}) on conflict(id) do nothing`;
  sql = postgres({ ...opts, max: 20, connection: { options: "-c role=inviteizi_server" } });
  repo = new PgRepo(sql);
  expect((await sql`select current_user as role`)[0].role).toBe("inviteizi_server");
}, 30000);
afterAll(async () => {
  if (sql) await sql.end();
  if (root) await root.end();
  vi.unstubAllEnvs();
  if (native) await writeFile(join(tmpdir(), "inviteizi-native-load.json"), JSON.stringify(timings, null, 2));
});
async function order(userId = ++n, status: "preview" | "receipt_sent" = "preview") {
  await repo.touchUser({ id: userId });
  return repo.createOrder({
    userId,
    occasion: "nikoh",
    format: "animated",
    templateId: "muhr",
    data: getDesign("muhr")!.sample,
    music: { kind: "none" },
    amount: PRICES.animated,
    slugBase: "fixture-" + userId + "-" + ++n,
    status,
  });
}
async function cash(userId = ++n) {
  const o = await order(userId, "receipt_sent");
  await repo.marketing.confirm(
    o.id,
    500,
    new Date(),
    "https://fixture.invalid",
    "kaspi",
    computeExpiresAt(o.data.events),
    flags,
  );
  return (await repo.getOrder(o.id))!;
}
for (const count of [3, 10, 20])
  it.skipIf(!native)(
    `${count} concurrent cash confirmations: one activation/credit/job per order`,
    async () => {
      const host = await cash(),
        source = await repo.marketing.publicCode(host.id);
      const orders = [];
      for (let i = 0; i < count; i++) {
        const id = ++n;
        await repo.touchUser({ id });
        expect(await repo.marketing.capture(id, source!)).toBe(true);
        orders.push(await order(id, "receipt_sent"));
      }
      const start = performance.now();
      const result = await Promise.all(
        orders.flatMap((o) =>
          [1, 2].map(() =>
            repo.marketing.confirm(
              o.id,
              500,
              new Date(),
              "https://fixture.invalid",
              "kaspi",
              computeExpiresAt(o.data.events),
              flags,
            ),
          ),
        ),
      );
      expect(result.filter(Boolean)).toHaveLength(count);
      const ids = sql.array(orders.map((o) => o.id));
      expect(
        (await sql`select count(*)::int as n from public.partner_earnings where order_id=any(${ids}::uuid[])`)[0].n,
      ).toBe(count);
      expect(
        (
          await sql`select count(*)::int as n from public.marketing_audit where order_id=any(${ids}::uuid[]) and kind='payment_confirmed'`
        )[0].n,
      ).toBe(count);
      expect((await repo.marketing.referralStats(host.userId))?.earned).toBe(1000 * count);
      timings.push({
        clients: count,
        parallelRequests: count * 2,
        ms: Math.round(performance.now() - start),
        uniqueCredits: count,
        status: "PASS",
      });
    },
    30000,
  );
it.skipIf(!native)(
  "last promotion slot:20 concurrent reservations and confirmations cannot become21; free has no cash/commission",
  async () => {
    const code = "LAST" + ++n;
    await repo.marketing.createPromo(500, code, 100, 1, null);
    const orders = await Promise.all(Array.from({ length: 20 }, () => order()));
    const reservations = await Promise.allSettled(
      orders.map((o) => repo.marketing.reservePromo(o.userId, o.id, code, new Date())),
    );
    expect(reservations.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const winner = orders[reservations.findIndex((r) => r.status === "fulfilled")];
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        repo.marketing.confirm(
          winner.id,
          winner.userId,
          new Date(),
          "https://fixture.invalid",
          "promotion",
          computeExpiresAt(winner.data.events),
          flags,
        ),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await repo.getOrder(winner.id)).toMatchObject({ status: "active", amount: 0, paidAt: null });
    expect(await sql`select order_id from public.partner_earnings where order_id=${winner.id}`).toHaveLength(0);
    expect(
      await sql`select kind from public.analytics_events where kind='payment_confirmed' and dedupe_key=${winner.id}`,
    ).toHaveLength(0);
  },
  30000,
);
it.skipIf(!native)(
  "20-family code rejects21st; reservations expire and unpaid cancellation releases capacity",
  async () => {
    const code = "FAMILIES" + ++n;
    await repo.marketing.createPromo(500, code, 100, 20, null);
    const orders = await Promise.all(Array.from({ length: 21 }, () => order()));
    const results = await Promise.allSettled(
      orders.map((o) => repo.marketing.reservePromo(o.userId, o.id, code, new Date())),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(20);
    const accepted = orders[results.findIndex((r) => r.status === "fulfilled")],
      rejected = orders[results.findIndex((r) => r.status === "rejected")];
    await repo.cancelOrder(accepted.id, accepted.userId);
    expect(await repo.marketing.reservePromo(rejected.userId, rejected.id, code, new Date())).toMatchObject({
      amount: 0,
    });
    const expiry = orders.filter((o) => o.id !== accepted.id && o.id !== rejected.id)[0];
    await repo.marketing.releaseExpired(new Date(Date.now() + 31 * 60000), expiry.id);
    expect((await repo.getOrder(expiry.id))?.amount).toBe(7990);
  },
  30000,
);
it.skipIf(!native)(
  "no credit for unconfirmed/self/free; first valid source cannot be replaced or pay twice for one friend",
  async () => {
    const host = await cash(),
      other = await cash(),
      source = await repo.marketing.publicCode(host.id),
      second = await repo.marketing.publicCode(other.id);
    expect(await repo.marketing.capture(host.userId, source!)).toBe(false);
    const id = ++n;
    await repo.touchUser({ id });
    expect(await repo.marketing.capture(id, "inv_" + "f".repeat(32))).toBe(false);
    expect(await repo.marketing.capture(id, source!)).toBe(true);
    expect(await repo.marketing.capture(id, second!)).toBe(false);
    const o = await order(id);
    const p = await repo.marketing.referralStats(host.userId);
    expect(await repo.creditPartnerOrder(o.id, id, p!.code)).toBeNull();
    await repo.transition(o.id, ["preview"], "receipt_sent");
    await repo.marketing.confirm(o.id, 500, new Date(), "https://fixture.invalid", "kaspi", null, flags);
    await cash(id);
    expect((await repo.marketing.referralStats(host.userId))?.earned).toBe(1000);
  },
);
it.skipIf(!native)(
  "refund is audited once, reverses earnings once, does not initiate or undo bank payouts",
  async () => {
    const host = await cash(),
      id = ++n;
    await repo.touchUser({ id });
    await repo.marketing.capture(id, (await repo.marketing.publicCode(host.id))!);
    const o = await cash(id);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => repo.marketing.refund(500, o.id, "fixture verified refund", new Date())),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await repo.marketing.referralStats(host.userId))?.earned).toBe(0);
    expect((await repo.getOrder(o.id))?.refundedAt).toBeTruthy();
    expect(await sql`select id from public.marketing_audit where event_key=${"refund:" + o.id}`).toHaveLength(1);
  },
);
it.skipIf(!native)(
  "free-edit allowance:20 parallel requests reserve one; owner applies date once, clients remain locked",
  async () => {
    const o = await cash();
    const [job] = await sql`select key from public.bot_notices where key=${"mk:paid_pack:" + o.id}`;
    await root`update public.orders set marketing_issued_at=now() where id=${o.id}`;
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        repo.marketing.requestEdit(o.userId, o.id, "request:" + o.id + ":" + i, "Тўй санаси хато", new Date()),
      ),
    );
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    expect(results.every((r) => r.fee === 0)).toBe(true);
    expect(await repo.marketing.applyDateEdit(500, results[0].id, "2027-03-22", "18:30", 0, new Date())).toBe(true);
    expect(await repo.marketing.applyDateEdit(500, results[0].id, "2027-04-22", "18:30", 0, new Date())).toBe(false);
    expect((await repo.getOrder(o.id))?.data.events[0].date).toBe("2027-03-22");
    const next = await repo.marketing.requestEdit(o.userId, o.id, "next:" + o.id, "Иккинчи тузатиш", new Date());
    expect(next.fee).toBe(2000);
    expect(job).toBeTruthy();
    await expect(repo.marketing.applyDateEdit(o.userId, next.id, "2027-03-22", "18:30", 0, new Date())).rejects.toThrow(
      "forbidden",
    );
  },
);
it.skipIf(!native)("leases/ack retries survive worker restart and stale tokens cannot ack another worker", async () => {
  const o = await cash();
  await root`update public.bot_notices set sent_at=now() where key<>${"mk:paid_pack:" + o.id}`;
  const now = new Date(),
    jobs = await Promise.all([repo.marketing.claimJobs(now), repo.marketing.claimJobs(now)]);
  expect(jobs.flat()).toHaveLength(1);
  const job = jobs.flat()[0];
  expect((await repo.marketing.issuance(o.id))?.marketing_issued_at).toBeNull();
  const next = (await repo.marketing.claimJobs(new Date(+now + 121000)))[0];
  expect(next.key).toBe(job.key);
  expect(await repo.marketing.ackJob(job, new Date())).toBe(false);
  expect(await repo.marketing.ackJob(next, new Date(), 123)).toBe(true);
  expect((await repo.marketing.issuance(o.id))?.marketing_issued_at).toBeTruthy();
});
it.skipIf(!native)(
  "RLS/private money tables and immutable audit reject anonymous reads/app-role rewrites",
  async () => {
    await expect(sql`delete from public.marketing_audit`).rejects.toMatchObject({ code: "42501" });
    await expect(
      root.begin(async (tx) => {
        await tx`set local role anon`;
        await tx`select * from public.marketing_attributions`;
      }),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(repo.marketing.createPromo(123, "BAD", 100, 1, null)).rejects.toThrow("forbidden");
  },
);
it.skipIf(!native)(
  "0% existing campaign keeps visits/customers, confirmed sales/revenue and0 commission in one ledger",
  async () => {
    const partner = await repo.createPartner({
      code: "zero" + ++n,
      name: "Telegram campaign fixture",
      rate: 0,
      ratePercent: 0,
      telegramId: ++n,
      username: null,
      status: "active",
    });
    const id = ++n;
    await repo.touchUser({ id, source: "p_" + partner.code });
    const o = await order(id, "receipt_sent");
    await repo.marketing.confirm(o.id, 500, new Date(), "https://fixture.invalid", "kaspi", null, flags);
    const s = await repo.panelSnapshot();
    expect(s.users.find((u) => u.id === id)?.source).toBe("p_" + partner.code);
    expect(s.orders.find((x) => x.id === o.id)?.amount).toBe(7990);
    expect(s.earnings.find((e) => e.orderId === o.id)).toMatchObject({ partnerId: partner.id, amount: 0 });
  },
);
it.skipIf(!native)(
  "transaction failure after monetary writes rolls activation/audit/credit back; retry commits once",
  async () => {
    const o = await order(undefined, "receipt_sent");
    await root.unsafe(
      "create function public.task7_fail_notice() returns trigger language plpgsql as $$begin raise exception 'fixture database unavailable' using errcode='40001';end$$;create trigger task7_fail_notice before insert on public.bot_notices for each row execute function public.task7_fail_notice();",
    );
    try {
      await expect(
        repo.marketing.confirm(o.id, 500, new Date(), "https://fixture.invalid", "kaspi", null, flags),
      ).rejects.toMatchObject({ code: "40001" });
      expect((await repo.getOrder(o.id))?.status).toBe("receipt_sent");
      expect(await sql`select event_key from public.marketing_audit where event_key=${"payment:" + o.id}`).toHaveLength(
        0,
      );
    } finally {
      await root.unsafe(
        "drop trigger task7_fail_notice on public.bot_notices;drop function public.task7_fail_notice();",
      );
    }
    expect(await repo.marketing.confirm(o.id, 500, new Date(), "https://fixture.invalid", "kaspi", null, flags)).toBe(
      o.id,
    );
    expect(
      await repo.marketing.confirm(o.id, 500, new Date(), "https://fixture.invalid", "kaspi", null, flags),
    ).toBeNull();
  },
);
it.skipIf(!native)(
  "discounted receipt reserves inventory past expiry until actual decision; cancellation/rejection releases it",
  async () => {
    const code = "PARTIAL" + ++n;
    await repo.marketing.createPromo(500, code, 25, 1, null);
    const o = await order();
    expect((await repo.marketing.reservePromo(o.userId, o.id, code, new Date())).amount).toBe(5990);
    await repo.transition(o.id, ["preview"], "receipt_sent");
    await repo.marketing.releaseExpired(new Date(Date.now() + 86400000));
    expect((await repo.getOrder(o.id))?.amount).toBe(5990);
    const other = await order();
    await expect(repo.marketing.reservePromo(other.userId, other.id, code, new Date())).rejects.toThrow(
      "promo_exhausted",
    );
    await repo.transition(o.id, ["receipt_sent"], "rejected");
    expect((await repo.getOrder(o.id))?.amount).toBe(7990);
    expect((await repo.marketing.reservePromo(other.userId, other.id, code, new Date())).amount).toBe(5990);
  },
);
it.skipIf(!native)(
  "expired/disabled code, missing consent backing, foreign actor and late free edit fail closed",
  async () => {
    const o = await order(),
      code = "DISABLED" + ++n;
    await repo.marketing.createPromo(500, code, 100, 1, null);
    await repo.marketing.disablePromo(500, code);
    await expect(repo.marketing.reservePromo(o.userId, o.id, code, new Date())).rejects.toThrow("promo_unavailable");
    await expect(
      repo.marketing.confirm(o.id, o.userId, new Date(), "https://fixture.invalid", "promotion", null, flags),
    ).rejects.toThrow("promo_unavailable");
    await expect(
      repo.marketing.confirm(o.id, 123, new Date(), "https://fixture.invalid", "kaspi", null, flags),
    ).rejects.toThrow("forbidden");
    const paid = await cash();
    await root`update public.orders set marketing_issued_at=${new Date(Date.now() - 86400001)} where id=${paid.id}`;
    expect(
      (await repo.marketing.requestEdit(paid.userId, paid.id, "late:" + paid.id, "Late fixture edit", new Date())).fee,
    ).toBe(2000);
  },
);
it.skipIf(!native)(
  "three complete bot journeys + duplicate approval webhook: persistent paid links, referral and status exactly once after ACK",
  async () => {
    const { Sim } = await import("./testing/sim"),
      { nikohWithReceipt } = await import("./testing/paths"),
      { handleWebhookRequest } = await import("./webhook");
    await root`update public.bot_notices set sent_at=now() where sent_at is null`;
    const poster = await import("@/lib/marketing/status-poster");
    const render = vi.spyOn(poster, "statusPoster").mockResolvedValue(new Uint8Array([1, 2, 3]));
    try {
      const sim = new Sim({ now: "2026-12-01T07:00:00Z" });
      sim.deps.repo = repo;
      sim.repo = repo as unknown as typeof sim.repo;
      sim.deps.env = {
        ...sim.deps.env,
        marketing: { ui: true, delivery: true, referrals: true, promos: true, status: true, edits: true },
      };
      const host = await cash();
      const source = (await repo.marketing.publicCode(host.id))!;
      await root`update public.bot_notices set sent_at=now() where sent_at is null`;
      const ids = [++n, ++n, ++n];
      for (const id of ids) await sim.start(id, source);
      const created = await Promise.all(ids.map((id) => nikohWithReceipt(sim, id)));
      expect(new Set(created.map((o) => o.id)).size).toBe(3);
      for (const o of created) {
        expect(o.status).toBe("receipt_sent");
        expect(await sql`select order_id from public.partner_earnings where order_id=${o.id}`).toHaveLength(0);
      }
      const requests = created.map((o, i) => ({
        update_id: 900000 + i,
        callback_query: {
          id: "approve-" + i,
          from: { id: 500, is_bot: false, first_name: "Owner" },
          message: { message_id: 100, date: 0, chat: { id: 500, type: "private" } },
          chat_instance: "fixture",
          data: "ok:" + o.number,
        },
      }));
      const call = (body: unknown) =>
        handleWebhookRequest(
          new Request("https://fixture.invalid/api/bot", {
            method: "POST",
            headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": "fixture" },
            body: JSON.stringify(body),
          }),
          { secret: "fixture", getDeps: () => ({ ...sim.deps }) },
        );
      const responses = await Promise.all(requests.flatMap((r) => [call(r), call(r)]));
      expect(responses.map((r) => r.status)).toEqual(Array(6).fill(200));
      const { flushMarketing } = await import("./marketing");
      await flushMarketing(sim.deps);
      for (const o of created) {
        expect((await repo.getOrder(o.id))?.status).toBe("active");
        expect((await repo.marketing.issuance(o.id))?.marketing_issued_at).toBeTruthy();
        expect(
          await sql`select key from public.bot_notices where key like ${"mk:%:" + o.id} and sent_at is not null`,
        ).toHaveLength(3);
        expect(sim.tg.messages.filter((m) => m.chatId === o.userId && m.text.includes("Статусга қўйинг"))).toHaveLength(
          1,
        );
      }
      const before = sim.tg.messages.length;
      for (const r of requests) expect((await call(r)).status).toBe(200);
      await flushMarketing({ ...sim.deps });
      expect(sim.tg.messages.length).toBe(before);
      expect((await repo.marketing.referralStats(host.userId))?.earned).toBe(3000);
    } finally {
      render.mockRestore();
    }
  },
  60000,
);
it.skipIf(!native)(
  "Telegram link/image failures recover independently; ambiguous status send needs owner review instead of duplicate",
  async () => {
    const { Sim } = await import("./testing/sim"),
      { flushMarketing } = await import("./marketing"),
      poster = await import("@/lib/marketing/status-poster");
    await root`update public.bot_notices set sent_at=now() where sent_at is null`;
    const sim = new Sim();
    sim.deps.repo = repo;
    sim.deps.env = {
      ...sim.deps.env,
      marketing: { ui: true, delivery: true, referrals: true, promos: true, status: true, edits: true },
    };
    sim.clock = new Date();
    const o = await cash();
    const render = vi
      .spyOn(poster, "statusPoster")
      .mockRejectedValueOnce(new Error("fixture image failure"))
      .mockResolvedValue(new Uint8Array([1]));
    const photo = vi.spyOn(sim.tg, "sendPhoto").mockRejectedValueOnce(new Error("fixture QR transport failure"));
    const message = vi.spyOn(sim.tg, "sendMessage").mockRejectedValueOnce(new Error("fixture text transport failure"));
    try {
      await flushMarketing(sim.deps);
      expect((await repo.getOrder(o.id))?.status).toBe("active");
      expect((await repo.marketing.issuance(o.id))?.marketing_issued_at).toBeNull();
      photo.mockRestore();
      message.mockRestore();
      sim.advance(2);
      await flushMarketing(sim.deps);
      expect((await repo.marketing.issuance(o.id))?.marketing_issued_at).toBeTruthy();
      expect(
        (await sql`select sent_at from public.bot_notices where key=${"mk:status:" + o.id}`)[0].sent_at,
      ).toBeNull();
      sim.advance(2);
      await flushMarketing(sim.deps);
      expect(
        (await sql`select sent_at from public.bot_notices where key=${"mk:status:" + o.id}`)[0].sent_at,
      ).toBeTruthy();
      const second = await cash();
      await root`update public.orders set marketing_issued_at=now() where id=${second.id}`;
      await root`update public.bot_notices set sent_at=now() where key<>${"mk:status:" + second.id} and sent_at is null`;
      const job = (await repo.marketing.claimJobs(sim.clock))[0];
      expect(job.body.kind).toBe("status");
      await repo.marketing.markSending(job, sim.clock);
      const later = new Date(+sim.clock + 121000);
      expect(await repo.marketing.claimJobs(later)).toHaveLength(0);
      expect(
        (await repo.marketing.deliveryProblems(500)).some(
          (r) => r.key === job.key && r.last_error_code === "ambiguous_status_send",
        ),
      ).toBe(true);
    } finally {
      photo.mockRestore();
      message.mockRestore();
      render.mockRestore();
    }
  },
  30000,
);
it.skipIf(!native)(
  "100% promotion through customer dialogue: explicit confirmation activates once without cash or Kaspi success caption",
  async () => {
    const { Sim } = await import("./testing/sim"),
      { nikohOrder } = await import("./testing/paths"),
      { uz } = await import("@/texts/bot-uz");
    await root`update public.bot_notices set sent_at=now() where sent_at is null`;
    const sim = new Sim({ now: "2026-12-01T07:00:00Z" });
    sim.deps.repo = repo;
    sim.repo = repo as unknown as typeof sim.repo;
    sim.deps.env = {
      ...sim.deps.env,
      marketing: { ui: true, delivery: true, referrals: true, promos: true, status: false, edits: true },
    };
    const id = ++n,
      o = await nikohOrder(sim, id),
      code = "DIALOG" + ++n;
    await repo.marketing.createPromo(500, code, 100, 1, null);
    await sim.command(id, "promo", o.number + " " + code);
    expect((await repo.getOrder(o.id))?.status).toBe("preview");
    await sim.callback(id, "pay:" + o.number, sim.tg.messages.filter((m) => m.chatId === id).at(-1)!.id);
    await sim.click(id, uz.pay.confirmYes);
    expect(await repo.getOrder(o.id)).toMatchObject({ status: "active", amount: 0, paidAt: null });
    expect((await repo.marketing.issuance(o.id))?.marketing_issued_at).toBeTruthy();
    expect(sim.tg.messages.some((m) => m.chatId === id && m.text.includes("Kaspi тўлови талаб қилинмайди"))).toBe(true);
    expect(await sql`select order_id from public.partner_earnings where order_id=${o.id}`).toHaveLength(0);
  },
  30000,
);
it.skipIf(!native)(
  "paid correction requires explicit owner fee decision; audit preserves earning snapshot after refund",
  async () => {
    const host = await cash(),
      id = ++n;
    await repo.touchUser({ id });
    await repo.marketing.capture(id, (await repo.marketing.publicCode(host.id))!);
    const o = await cash(id);
    await root`update public.orders set marketing_issued_at=now()-interval '25 hours' where id=${o.id}`;
    const edit = await repo.marketing.requestEdit(id, o.id, "paid-edit:" + o.id, "Change date", new Date());
    expect(edit.fee).toBe(2000);
    await expect(repo.marketing.applyDateEdit(500, edit.id, "2027-05-20", "18:00", 0, new Date())).rejects.toThrow(
      "edit_fee_confirmation_required",
    );
    expect(await repo.marketing.applyDateEdit(500, edit.id, "2027-05-20", "18:00", 0, new Date(), true)).toBe(true);
    await repo.marketing.refund(500, o.id, "Fixture actual refund", new Date());
    expect(
      (await sql`select facts from public.marketing_audit where event_key=${"earning:" + o.id}`)[0].facts.amount,
    ).toBe(1000);
    expect((await sql`select amount from public.partner_earnings where order_id=${o.id}`)[0].amount).toBe(0);
  },
);
it.skipIf(!native)("flags-off legacy notice worker never consumes paused marketing jobs", async () => {
  await root`update public.bot_notices set sent_at=now() where sent_at is null`;
  const o = await cash();
  expect(await repo.claimDueNotices(new Date(Date.now() + 3600000), 50)).toHaveLength(0);
  expect((await sql`select sent_at from public.bot_notices where key=${"mk:paid_pack:" + o.id}`)[0].sent_at).toBeNull();
});

// ── Готовность к рекламе (17.11.2026): полные пути клиента на настоящей базе ──

async function launchSim() {
  const { Sim } = await import("./testing/sim");
  const sim = new Sim({ now: "2026-12-01T07:00:00Z" });
  sim.deps.repo = repo;
  sim.repo = repo as unknown as typeof sim.repo;
  sim.deps.env = {
    ...sim.deps.env,
    marketing: { ui: true, delivery: true, referrals: true, promos: true, status: true, edits: true },
  };
  return sim;
}
const owner = { id: 500, firstName: null, username: null, languageCode: null };

it.skipIf(!native)(
  "реклама через партнёра: join_ из админки → клиент по ссылке партнёра → заказ → чек → ✅ (дважды) → начисление ровно 1 раз",
  async () => {
    const { ownerAdmin } = await import("./app/owner-admin"),
      { nikohWithReceipt } = await import("./testing/paths"),
      { uz } = await import("@/texts/bot-uz"),
      { partnerSource } = await import("@/lib/owner-panel");
    const sim = await launchSim();
    const made = (await ownerAdmin(sim.deps, owner, "ownerPartnerNew", {
      name: "Салон " + ++n,
      phone: "+7 701 555 44 33",
      rate: "15%",
      schedule: "weekly",
    })) as { id: number; link: string };
    const partnerUser = ++n;
    await sim.start(partnerUser, "join_" + /start=join_([a-z0-9]+)/.exec(made.link)![1]);
    await sim.click(partnerUser, uz.langUz);
    await sim.contact(partnerUser, "77015554433");
    expect((await repo.getPartner(made.id))?.telegramId).toBe(partnerUser);

    const client = ++n;
    await sim.start(client, partnerSource((await repo.getPartner(made.id))!.code));
    const o = await nikohWithReceipt(sim, client);
    expect(o.status).toBe("receipt_sent");
    await sim.callback(500, `ok:${o.number}`, 1);
    await sim.callback(500, `ok:${o.number}`, 1);
    expect((await repo.getOrder(o.id))?.status).toBe("active");
    const earnings = await sql`select amount from public.partner_earnings where partner_id=${made.id}`;
    expect(earnings.map((e) => Number(e.amount))).toEqual([Math.round((o.amount * 15) / 100)]);
    const due = (await ownerAdmin(sim.deps, owner, "ownerPayouts", {})) as { due: { id: number; amount: number }[] };
    expect(due.due.find((x) => x.id === made.id)?.amount).toBe(Math.round((o.amount * 15) / 100));
  },
  60000,
);

it.skipIf(!native)(
  "промокод: код из админки → клиент вводит → цена со скидкой → чек → ✅ списан 1 раз; ❌ — использование возвращается",
  async () => {
    const { ownerAdmin } = await import("./app/owner-admin"),
      { nikohOrder } = await import("./testing/paths"),
      { uz } = await import("@/texts/bot-uz");
    const sim = await launchSim();
    const code = "LAUNCH" + ++n;
    expect(await ownerAdmin(sim.deps, owner, "ownerPromoCreate", { code, percent: 25, limit: 1 })).toMatchObject({
      ok: true,
    });
    const used = async () =>
      (
        (await ownerAdmin(sim.deps, owner, "ownerPromos", {})) as {
          promos: { code: string; used: number; reserved: number }[];
        }
      ).promos.find((p) => p.code === code)!;
    const pay = async (client: number) => {
      const o = await nikohOrder(sim, client);
      await sim.command(client, "promo", `${o.number} ${code.toLowerCase()}`);
      const quoted = (await repo.getOrder(o.id))!;
      await sim.click(client, /^💳 Тўлаш/);
      await sim.click(client, uz.pay.confirmYes);
      await sim.photo(client, `RECEIPT_${client}`);
      return { o, quoted, after: (await repo.getOrder(o.id))! };
    };

    // 1) ❌ владельца: использование возвращается, цена — снова полная
    const first = await pay(++n);
    expect(first.quoted.amount).toBe(discounted(first.o.amount, 25));
    expect(first.after.status).toBe("receipt_sent");
    expect(await used()).toMatchObject({ used: 0, reserved: 1 });
    await sim.callback(500, `nr:${first.o.number}:money`, 1);
    expect(await repo.getOrder(first.o.id)).toMatchObject({ status: "rejected", amount: first.o.amount });
    expect(await used()).toMatchObject({ used: 0, reserved: 0 });

    // 2) лимит 1 снова свободен: другой клиент, ✅ дважды → списан ровно 1 раз
    const second = await pay(++n);
    expect(second.after).toMatchObject({ status: "receipt_sent", amount: discounted(second.o.amount, 25) });
    await sim.callback(500, `ok:${second.o.number}`, 1);
    await sim.callback(500, `ok:${second.o.number}`, 1);
    expect((await repo.getOrder(second.o.id))?.status).toBe("active");
    expect(await used()).toMatchObject({ used: 1, reserved: 0 });
    expect(
      await sql`select state from public.promotion_reservations r join public.promotion_codes p on p.id=r.promo_id where p.code=${code}`,
    ).toEqual(expect.arrayContaining([{ state: "consumed" }, { state: "released" }]));

    // 3) лимит исчерпан: третий клиент код не получает, цена полная
    const third = ++n;
    const o3 = await nikohOrder(sim, third);
    await sim.command(third, "promo", `${o3.number} ${code}`);
    expect((await repo.getOrder(o3.id))?.amount).toBe(o3.amount);
  },
  60000,
);

// ── Акции, поле промокода, оптовики (17.11.2026) на настоящей базе ──

async function freshPromotions() {
  await root`update public.promotions set stopped_at=now() where stopped_at is null`;
}
const ownerUser = (id: number) => ({ id, firstName: null, username: null, languageCode: null });

it.skipIf(!native)(
  "поле промокода (Mini App): применение, лимит, ❌ возвращает; не для партнёра и оптовика; акция больше — берётся акция",
  async () => {
    await freshPromotions();
    const { ownerAdmin } = await import("./app/owner-admin"),
      app = await import("./app/service"),
      { nikohOrder } = await import("./testing/paths"),
      { uz } = await import("@/texts/bot-uz");
    const sim = await launchSim();
    const code = "FIELD" + ++n;
    await ownerAdmin(sim.deps, owner, "ownerPromoCreate", { code, percent: 20, limit: 1 });
    // 1) клиент: −20 % → 6 400 ₸, кратно 100
    const a = ++n;
    const oa = await nikohOrder(sim, a);
    const r = (await app.promoForOrder(sim.deps, ownerUser(a), oa.id, code.toLowerCase())) as {
      order: { amount: number; price: { kind: string; before: number } };
    };
    expect(r.order).toMatchObject({ amount: 6390, price: { kind: "promo", before: 7990 } });
    // 2) лимит 1: второй клиент — «закончился»
    const b = ++n;
    const ob = await nikohOrder(sim, b);
    expect(await app.promoForOrder(sim.deps, ownerUser(b), ob.id, code)).toEqual({ error: "promo_exhausted" });
    // 3) чек → ❌ — код снова свободен, цена полная
    await sim.click(a, /^💳 Тўлаш/);
    await sim.click(a, uz.pay.confirmYes);
    await sim.photo(a, "RECEIPT_" + a);
    expect((await repo.getOrder(oa.id))?.status).toBe("receipt_sent");
    await sim.callback(500, `nr:${oa.number}:money`, 1);
    expect(await repo.getOrder(oa.id)).toMatchObject({ status: "rejected", amount: 7990 });
    expect(await app.promoForOrder(sim.deps, ownerUser(b), ob.id, code)).toMatchObject({ ok: true });
    // 4) оптовик — «не для вас», цена оптовая
    const w = ++n;
    const ow = await nikohOrder(sim, w);
    await ownerAdmin(sim.deps, owner, "ownerWholesaleSet", { userId: w, percent: 10 });
    expect(await app.promoForOrder(sim.deps, ownerUser(w), ow.id, code)).toEqual({ error: "notForYou" });
    // 5) акция 50 % больше кода 20 % — бронь снимается, берётся акция
    const big = "SMALL" + ++n;
    await ownerAdmin(sim.deps, owner, "ownerPromoCreate", { code: big, percent: 20, limit: 5 });
    await ownerAdmin(sim.deps, owner, "ownerPromotionCreate", {
      name: "Катта",
      percent: 50,
      startsAt: "2026-11-30T00:00",
      endsAt: "2026-12-10T00:00",
    });
    const c = ++n;
    const oc = await nikohOrder(sim, c);
    expect(await app.promoForOrder(sim.deps, ownerUser(c), oc.id, big)).toEqual({ error: "better" });
    expect(await repo.getOrder(oc.id)).toMatchObject({ amount: 3990, pricing: { kind: "promotion", percent: 50 } });
    expect(
      (await sql`select state from public.promotion_reservations where order_id=${oc.id}`).map((x) => x.state),
    ).toEqual(["released"]);
    expect((await sql`select promotion_id from public.orders where id=${oc.id}`)[0].promotion_id).toBeTruthy();
  },
  60000,
);

it.skipIf(!native)(
  "акция 100 % на базе: без чека, ссылка сразу, начислений нет; партнёру и оптовику цена обычная/оптовая",
  async () => {
    await freshPromotions();
    const { ownerAdmin } = await import("./app/owner-admin"),
      { nikohOrder } = await import("./testing/paths"),
      { salesTexts } = await import("@/texts/sales"),
      { uz } = await import("@/texts/bot-uz"),
      { partnerSource } = await import("@/lib/owner-panel");
    const sim = await launchSim();
    await ownerAdmin(sim.deps, owner, "ownerPromotionCreate", {
      name: "Бепул",
      percent: 100,
      startsAt: "2026-11-30T00:00",
      endsAt: "2026-12-10T00:00",
    });
    // партнёр: цена обычная
    const made = (await ownerAdmin(sim.deps, owner, "ownerPartnerNew", {
      name: "Салон " + ++n,
      phone: "+7 701 555 44 33",
      rate: "1000",
      schedule: "weekly",
    })) as { id: number; link: string };
    const pu = ++n;
    await sim.start(pu, "join_" + /start=join_([a-z0-9]+)/.exec(made.link)![1]);
    await sim.click(pu, uz.langUz);
    await sim.contact(pu, "77015554433");
    const op = await nikohOrder(sim, pu);
    await sim.click(pu, /^💳 Тўлаш/);
    expect((await repo.getOrder(op.id))?.amount).toBe(7990);
    // клиент по ссылке партнёра (акция по умолчанию не для него) — цена обычная
    const viaPartner = ++n;
    await sim.start(viaPartner, partnerSource((await repo.getPartner(made.id))!.code));
    const ov = await nikohOrder(sim, viaPartner);
    await sim.click(viaPartner, /^💳 Тўлаш/);
    expect((await repo.getOrder(ov.id))?.amount).toBe(7990);
    // обычный клиент: 0 ₸, без Kaspi и чека
    const client = ++n;
    const o = await nikohOrder(sim, client);
    await sim.click(client, /^💳 Тўлаш/);
    expect((await repo.getOrder(o.id))?.amount).toBe(0);
    await sim.click(client, salesTexts.uz.freeAction);
    const done = (await repo.getOrder(o.id))!;
    expect(done).toMatchObject({ status: "active", amount: 0, receipt: null, pricing: { kind: "promotion" } });
    expect(sim.tg.to(client).some((m) => m.text.includes(`/${done.slug}`))).toBe(true);
    expect(await sql`select 1 from public.partner_earnings where order_id=${o.id}`).toHaveLength(0);
  },
  60000,
);

it.skipIf(!native)(
  "бот: «🎟 Промокод» на шаге оплаты → код → новая цена; неверный код — понятная ошибка",
  async () => {
    await freshPromotions();
    const { ownerAdmin } = await import("./app/owner-admin"),
      { nikohOrder } = await import("./testing/paths"),
      { salesTexts } = await import("@/texts/sales");
    const T = salesTexts.uz;
    const sim = await launchSim();
    const code = "BOT" + ++n;
    await ownerAdmin(sim.deps, owner, "ownerPromoCreate", { code, percent: 25, limit: 3 });
    const client = ++n;
    const o = await nikohOrder(sim, client);
    await sim.click(client, /^💳 Тўлаш/);
    await sim.click(client, T.promoBanner);
    expect(sim.lastText(client)).toContain(T.promoAsk);
    await sim.text(client, "NOSUCH");
    expect(sim.tg.to(client).some((m) => m.text.includes(T.promoErrors.promo_unavailable))).toBe(true);
    await sim.text(client, code.toLowerCase());
    expect(sim.tg.to(client).some((m) => m.text.includes(T.promoApplied(code, 25, "5 990 ₸")))).toBe(true);
    expect((await repo.getOrder(o.id))?.amount).toBe(5990);
    expect(sim.lastText(client)).toContain(T.promoLine(code, 25));
    // «✕ KOD: −25 %» — убрать: цена снова обычная, код освобождается
    await sim.click(client, `✕ ${T.promoActive(code, 25)}`);
    expect((await repo.getOrder(o.id))?.amount).toBe(7990);
    // Mini App: снова применить и убрать «✕»
    const app = await import("./app/service");
    const u = { id: client, firstName: null, username: null, languageCode: null };
    expect(await app.promoForOrder(sim.deps, u, o.id, code)).toMatchObject({ ok: true, order: { amount: 5990 } });
    expect(await app.removePromo(sim.deps, u, o.id)).toMatchObject({ ok: true, order: { amount: 7990, price: null } });
    await freshPromotions();
  },
  60000,
);

it.skipIf(!native)(
  "рассылка об акции на базе: два отправителя одновременно — каждое сообщение ровно один раз; повторная постановка не дублирует",
  async () => {
    await freshPromotions();
    const { broadcastKey, runBroadcast } = await import("./broadcast");
    const sim = await launchSim();
    const p = await repo.createPromotion({
      name: "Очередь",
      percent: 30,
      startsAt: new Date("2026-11-30T00:00:00Z"),
      endsAt: new Date("2026-12-10T00:00:00Z"),
      occasions: null,
      formats: null,
      forPartnerClients: false,
      createdBy: 500,
    });
    if (typeof p === "string") throw Error(p);
    expect(await repo.markPromotionBroadcast(p.id, "start", new Date(), 0)).toBe(true);
    expect(await repo.markPromotionBroadcast(p.id, "start", new Date(), 0)).toBe(false);
    const ids = Array.from({ length: 40 }, () => ++n);
    const rows = ids.map((id) => ({ key: broadcastKey(p.id, id, "start"), chatId: id, dueAt: new Date() }));
    expect(await repo.enqueueBroadcast(rows)).toBe(40);
    expect(await repo.enqueueBroadcast(rows)).toBe(0);
    const noWait = { sleep: async () => {} };
    await Promise.all([runBroadcast(sim.deps, noWait), runBroadcast(sim.deps, noWait)]);
    for (const id of ids)
      expect(
        sim.tg.to(id).filter((m) => m.type === "photo"),
        `${id}`,
      ).toHaveLength(1);
    expect(await repo.broadcastStats(`promo:${p.id}:`)).toEqual({ queued: 0, sent: 40, blocked: 0, failed: 0 });
    await freshPromotions();
  },
  60000,
);

it.skipIf(!native)(
  "оплата без чека на базе: payer_name и способ name сохраняются; чек по желанию дописывается к тому же заказу",
  async () => {
    const { payByName } = await import("./flow/pay-name");
    const sim = await launchSim();
    const o = await order();
    await repo.updateOrder(o.id, { payConfirmedAt: new Date() });
    const r = await payByName(sim.deps, o.userId, o.id, "Давронбек И.");
    expect(r).toMatchObject({ ok: true });
    const [row] = await sql`select status,payer_name,receipt_kind,receipt_file_id from public.orders where id=${o.id}`;
    expect(row).toEqual({
      status: "receipt_sent",
      payer_name: "Давронбек И.",
      receipt_kind: "name",
      receipt_file_id: null,
    });
    expect((await repo.getOrder(o.id))!).toMatchObject({ payerName: "Давронбек И.", receipt: null });
    await repo.updateOrder(o.id, { receipt: { fileId: "KASPI", kind: "photo" } });
    const [after] = await sql`select receipt_kind,receipt_file_id,payer_name from public.orders where id=${o.id}`;
    expect(after).toEqual({ receipt_kind: "photo", receipt_file_id: "KASPI", payer_name: "Давронбек И." });
  },
  60000,
);

it.skipIf(!native)(
  "строка об акции: время показа в users.promo_line_at — не чаще раза в 6 часов, переживает перезапуск",
  async () => {
    const id = ++n,
      t0 = new Date("2026-12-01T08:00:00Z"),
      gap = 6 * 3_600_000;
    await repo.touchUser({ id });
    expect(await repo.claimPromoLine(id, t0, gap)).toBe(true);
    // «Перезапуск сервера»: новый объект репозитория, та же база
    const fresh = new PgRepo(sql);
    expect(await fresh.claimPromoLine(id, new Date(+t0 + gap - 60_000), gap)).toBe(false);
    expect(await fresh.claimPromoLine(id, new Date(+t0 + gap), gap)).toBe(true);
  },
);

it.skipIf(!native)("проверка здоровья: отметки без сообщений, последнее время по префиксу, ping", async () => {
  const t1 = new Date("2026-12-01T08:00:00Z"),
    t2 = new Date("2026-12-01T08:10:00Z");
  expect(await repo.markNotice(`health:test:fail:1:`, t1)).toBe(true);
  expect(await repo.markNotice(`health:test:fail:1:`, t1)).toBe(false);
  await repo.markNotice(`health:test:fail:2:`, t2);
  expect(await repo.lastNoticeAt("health:test:fail:")).toEqual(t2);
  expect(await repo.lastNoticeAt("health:test:none:")).toBeNull();
  // Отметка никогда не уходит в Telegram
  expect((await repo.claimDueNotices(new Date("2030-01-01T00:00:00Z"), 100)).filter((n) => n.key.startsWith("health:"))).toEqual([]);
  await expect(repo.ping()).resolves.toBeUndefined();
});
