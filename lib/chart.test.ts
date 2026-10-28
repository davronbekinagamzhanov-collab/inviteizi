import { describe, it, expect, vi } from "vitest";
import { renderChart } from "./chart";
describe("real PNG charts", () => {
  it.each(["bars", "line"] as const)("renders empty %s without fake data", async kind => {
    const png = await renderChart("Тушум ў қ ғ ҳ", [], "Пока недостаточно данных", kind);
    expect([...png.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
  });
  it("long Cyrillic titles render without overflow failures", async () => {
    const png = await renderChart("Длинное название ".repeat(30), Array.from({length:10},(_,i) => ({ label: "Ўзбекистон қўшиғи ".repeat(30), value: i+1 })), "Пока недостаточно данных");
    expect(png.length).toBeGreaterThan(2000);
  });
  it("does not contact external fallback services for emoji, currency or unsupported glyphs",async()=>{
    const fetch=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("Network disabled"));
    try {
      await renderChart("🎵 Мусиқа ₸ 汉字",[{label:"Ўзбекистон — 🎵 ₸ 汉字",value:7000}],"Пока недостаточно данных");
      await renderChart("💰 Выручка ₸",[{label:"2026-10-25",value:7000}],"Пока недостаточно данных","line");
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });
});
