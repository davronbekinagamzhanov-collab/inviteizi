import { it, expect, vi } from "vitest";
import { Sim } from "../testing/sim";
import { nikohWithReceipt } from "../testing/paths";
it("paid owner uses correction button and one message; foreign user cannot request it", async () => {
  const s = new Sim();
  const o = await nikohWithReceipt(s, 1);
  await s.callback(500, "ok:" + o.number, 100);
  const requestEdit = vi.fn().mockResolvedValue({ id: "request", fee: 0 });
  s.deps.repo.marketing = {
    ready: async () => true,
    requestEdit,
    claimJobs: async () => [],
    markUpdate: async () => {},
    allowCommand: async () => true,
  } as unknown as NonNullable<typeof s.deps.repo.marketing>;
  s.deps.env = {
    ...s.deps.env,
    marketing: { delivery: true, edits: true, ui: false, referrals: false, status: false, promos: false },
  };
  await s.callback(1, "fix:" + o.number, 100);
  expect((await s.user(1))?.step).toBe("correction");
  await s.text(1, "Санани тузатинг");
  expect(requestEdit).toHaveBeenCalledTimes(1);
  expect(requestEdit.mock.calls[0][1]).toBe(o.id);
  expect((await s.user(1))?.step).toBe("idle");
  await s.start(2);
  await s.callback(2, "fix:" + o.number, 100);
  expect(requestEdit).toHaveBeenCalledTimes(1);
});
