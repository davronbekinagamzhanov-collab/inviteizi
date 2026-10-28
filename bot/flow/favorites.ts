import type { Ctx } from "./types";
import { activeDesigns, getDesign } from "@/templates/registry";
import { demoUrl, designName, inline, send } from "./util";

export async function favorites(c: Ctx) {
  if (c.chatId !== c.user.id) return;
  const ids = await c.deps.repo.listFavorites(c.user.id);
  if (!ids.length) { await send(c, c.tx.dashboard.favoriteEmpty); return; }
  for (const id of ids) {
    const available = activeDesigns().some(d => d.id === id);
    await send(c, `${designName(id)}${available ? "" : `\n${c.tx.dashboard.unavailable}`}`, inline([
      ...(available ? [[{ text: c.tx.catalog.demo, url: demoUrl(c,id) }, { text: c.tx.catalog.buy, data: `fav:choose:${id}` }]] : []),
      [{ text: c.tx.dashboard.favoriteRemove, data: `fav:remove:${id}` }],
    ]));
  }
}

export async function favoriteAction(c: Ctx, action: string, id: string) {
  if (c.chatId !== c.user.id || !getDesign(id)) return;
  if (action !== "add" && action !== "remove") return;
  if (action === "add" && !activeDesigns().some(d => d.id === id)) return;
  await c.deps.repo.setFavorite(c.user.id, id, action === "add");
  await send(c, action === "add" ? c.tx.dashboard.favoriteSaved : c.tx.dashboard.favoriteRemoved, inline([
    [{ text: action === "add" ? c.tx.dashboard.favoriteRemove : c.tx.dashboard.favoriteAdd, data: `fav:${action === "add" ? "remove" : "add"}:${id}` }],
    [{ text: c.tx.dashboard.favoriteList, data: "favorites" }],
  ]));
}
