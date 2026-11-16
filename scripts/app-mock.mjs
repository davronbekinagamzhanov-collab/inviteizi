// Заглушка /api/app для браузерных проверок Mini App (check-app.mjs, check-app-tg.mjs): база и Telegram не трогаются.
import "./ts-hooks.mjs";

const { getDesign } = await import("../templates/registry.ts");
export const TODAY = "2026-11-05";

/** Сервер-заглушка на одну проверку */
export function mockServer(lang, base) {
  let n = 100;
  const orders = [];
  const st = { lang, favorites: [], draft: null, calls: [], orders, rolePanel: null };
  return {
    st,
    async handle(route) {
      const req = route.request();
      const url = new URL(req.url());
      if (!req.headers()["x-tg-init-data"]) return route.fulfill({ status: 401, json: { error: "auth" } });
      if (url.pathname.endsWith("/upload")) {
        const kind = url.searchParams.get("kind");
        st.calls.push(`upload:${kind}`);
        if (kind === "photo") return route.fulfill({ json: { url: "/covers/ipak.webp" } });
        const o = orders.find((x) => x.id === url.searchParams.get("order"));
        if (o) Object.assign(o, { status: "receipt_sent", canPay: false, canEdit: false });
        return route.fulfill({ json: { ok: true, night: false } });
      }
      const body = JSON.parse(req.postData() ?? "{}");
      st.calls.push(body.action);
      switch (body.action) {
        case "session":
          return route.fulfill({ json: { userId: 1, lang: st.lang, firstName: "Test", favorites: st.favorites, draft: st.draft, orders, today: TODAY, pay: { phone: "+7 700 123 45 67", name: "Давронбек И.", card: null }, contact: "https://t.me/inviteizi_owner" } });
        case "lang":
          st.lang = body.lang;
          return route.fulfill({ json: { ok: true } });
        case "favorite":
          st.favorites = body.saved ? [body.templateId, ...st.favorites] : st.favorites.filter((x) => x !== body.templateId);
          return route.fulfill({ json: { favorites: st.favorites } });
        case "music":
          return route.fulfill({ json: { tracks: [{ id: "m1", title: "Ёр-ёр", url: "/music/none.mp3" }, { id: "m2", title: "Тўй муборак", url: "/music/none.mp3" }], others: [{ id: "m3", title: "Ош куйи", url: "/music/none.mp3", occasion: "nahorgi" }] } });
        case "musicUpload":
          if (body.size > 20 * 1024 * 1024) return route.fulfill({ status: 400, json: { error: "tooBig" } });
          return route.fulfill({ json: { clientToken: "vercel_blob_client_mock", pathname: "music/own/" + "e".repeat(32) + ".mp3", url: "https://abcd1234.public.blob.vercel-storage.com/music/own/" + "e".repeat(32) + ".mp3" } });
        case "draft":
          st.draft = body.draft;
          return route.fulfill({ json: { ok: true } });
        case "submit": {
          const d = body.draft;
          const f = d.form ?? {};
          let o = orders.find((x) => x.id === d.orderId);
          if (!o) {
            o = { id: `o${++n}`, number: n, status: "preview", canEdit: true, canPay: true, paid: false, confirmed: false, createdAt: new Date().toISOString() };
            orders.unshift(o);
          }
          Object.assign(o, { templateId: d.templateId, title: f.groom ? `${f.groom} & ${f.bride}` : f.person, date: f.events?.[0]?.date ?? null, check: `${f.groom ? `${f.groom} ва ${f.bride}` : f.person}\n📅 ${(f.events?.[0]?.date ?? "").split("-").reverse().join(".")}, ${f.events?.[0]?.time ?? ""} · ${f.events?.[0]?.venueName ?? ""}`, amount: { animated: 8000, scroll: 6000, simple: 5000 }[getDesign(d.templateId).format], url: `${base}/demo/${d.templateId}` });
          st.draft = { ...d, orderId: o.id };
          return route.fulfill({ json: { ok: true, order: o, created: true } });
        }
        case "confirmPay": {
          const o = orders.find((x) => x.id === body.orderId);
          if (!o) return route.fulfill({ json: { error: "notFound" } });
          Object.assign(o, { confirmed: true, status: "awaiting_payment" });
          return route.fulfill({ json: { ok: true, order: o } });
        }
        case "new":
          st.draft = null;
          return route.fulfill({ json: { ok: true } });
        case "orders":
          return route.fulfill({ json: { orders } });
        case "cancel": {
          const i = orders.findIndex((x) => x.id === body.orderId);
          if (body.orderId && i < 0) return route.fulfill({ json: { error: "notFound" } });
          if (i >= 0) orders.splice(i, 1);
          st.draft = null;
          return route.fulfill({ json: { ok: true } });
        }
        case "rolePanel":
          return st.rolePanel ? route.fulfill({ json: st.rolePanel }) : route.fulfill({ status: 403, json: { error: "forbidden" } });
        case "partnerPoster":
          return route.fulfill({ json: { ok: true } });
        default:
          return route.fulfill({ status: 400, json: { error: "bad" } });
      }
    },
  };
}

