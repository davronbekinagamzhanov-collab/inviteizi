/* eslint-disable @next/next/no-img-element -- Satori requires img; catalogue uses existing optimized local covers. */
/** Private server-rendered9:16 status. Existing licensed artwork; never covers with baked-in demo names. */
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { reportText } from '@/lib/chart';
import { getDesign } from '@/templates/registry';
import { photoAttributions, textsFor } from '@/texts/uz-cyrl';
import type { OrderRecord } from '@/lib/domain';
import { MAIN_EVENT } from '@/lib/order-rules';
import { parseWeddingDate } from '@/lib/wedding-date';
const themes: Record<string, {
    paper: string;
    ink: string;
    art: string;
    contain?: boolean;
    credit?: string;
}> = {
    muhr: { paper: '#f3f4f2', ink: '#2c3b49', art: '/art/natural/eucalyptus.webp', contain: true, credit: 'SYG_Anime · Pixabay' },
    'girih-barg': { paper: '#f6f7f2', ink: '#2f3a33', art: '/floral/eucalyptus-top.webp', contain: true, credit: 'PhuongLucky · Pixabay' },
    'muhrli-maktub': { paper: '#fff5ec', ink: '#725247', art: '/floral/rose-garland.webp', contain: true, credit: 'Urdu-Flex-Data · Pixabay' },
    'gul-doira': { paper: '#f5f6ee', ink: '#53634d', art: '/floral/tea-sprig.webp', contain: true, credit: 'SYG_Anime · Pixabay' },
    'bordo-guldasta': { paper: '#f7efe4', ink: '#7a2335', art: '/floral/burgundy-peony.webp', contain: true, credit: 'lucianapappdesign · Pixabay' }
};
let fonts: Promise<{
    normal: ArrayBuffer;
    italic: ArrayBuffer;
}> | undefined;
function fontData() { return fonts ??= Promise.all(['InviteStatusSerif-Regular.ttf', 'InviteStatusSerif-Italic.ttf'].map(f => readFile(join(process.cwd(), 'assets/fonts/status-lora', f)))).then(([n, i]) => ({ normal: Uint8Array.from(n).buffer, italic: Uint8Array.from(i).buffer })); }
export function statusFields(order: OrderRecord, lang: 'uz' | 'ru' = 'uz') {
    const text = textsFor(lang), e = order.data.events.find(e => e.kind === MAIN_EVENT[order.occasion]) ?? order.data.events[0], w = e ? parseWeddingDate(e.date, e.time) : null;
    return { names: reportText(order.occasion === 'nikoh' ? `${order.data.groom ?? ''} & ${order.data.bride ?? ''}` : order.data.person ?? order.data.hosts), title: reportText(text.occasionTitles[order.occasion]), date: w ? text.date.long(w.day, w.monthIndex, w.year) + ' · ' + e!.time : '', age: order.occasion === 'yubiley' && order.data.age ? order.data.age + ' ' + text.ageLabel : null };
}
export async function statusPoster(order: OrderRecord, url: string, lang: 'uz' | 'ru' = 'uz') {
    const target = new URL(url), local = process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1'].includes(target.hostname);
    if (target.protocol !== 'https:' && !local || target.username || target.password || target.search || target.hash || target.pathname !== '/' + order.slug)
        throw Error('Exact HTTPS invitation required');
    const design = getDesign(order.templateId);
    if (!design)
        throw Error('Unknown design');
    const theme = themes[design.id], colors = theme ? [theme.paper, theme.ink] : design.style === 'dark' ? ['#eee6dc', '#423e45'] : design.style === 'national' ? ['#f7f2e4', '#385c58'] : design.style === 'floral' ? ['#fcf3e8', '#794354'] : ['#faf4e8', '#66513c'];
    let image: string | null = null;
    const asset = design.art ?? theme?.art ?? (design.withPhoto ? `/art/${design.id}.webp` : null);
    if (asset && /^\/(art|floral|materials|pilots|vip)\/[a-zA-Z0-9_./-]+\.(webp|png|jpg|jpeg)$/.test(asset) && !asset.includes('..')) {
        try {
            const path = resolve(join(process.cwd(), 'public', asset));
            if (path.startsWith(resolve(process.cwd(), 'public') + '/')) {
                const bytes = await sharp(await readFile(path)).resize(960, 680, { fit: theme?.contain ? 'contain' : 'cover', background: colors[0] }).flatten({ background: colors[0] }).png().toBuffer();
                image = 'data:image/png;base64,' + bytes.toString('base64');
            }
        }
        catch { /* Typographic fallback remains usable when optional artwork is missing. */ }
    }
    const qr = await QRCode.toDataURL(url, { width: 280, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#25211c', light: '#ffffff' } }), font = await fontData(), fields = statusFields(order, lang), credit = theme?.credit ?? (photoAttributions[design.id] ? photoAttributions[design.id]!.author + ' · ' + photoAttributions[design.id]!.source : null);
    const response = new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: colors[0], color: colors[1], fontFamily: 'Status', flexDirection: 'column', alignItems: 'center', padding: 60 }}>
  {image && <div style={{ display: 'flex', width: '100%', height: 620, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><img alt="" src={image} width={960} height={680}/></div>}
  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '35px 10px' }}>
   <div style={{ display: 'flex', fontSize: 27, letterSpacing: 3 }}>{fields.title}</div>
   {fields.age && <div style={{ display: 'flex', fontSize: 42, marginTop: 18 }}>{fields.age}</div>}
   <div style={{ display: 'flex', fontSize: fields.names.length > 80 ? 48 : fields.names.length > 45 ? 62 : 86, fontStyle: 'italic', lineHeight: 1.18, textAlign: 'center', marginTop: 38, maxWidth: 920, flexWrap: 'wrap', justifyContent: 'center' }}>{fields.names}</div>
   <div style={{ display: 'flex', fontSize: 31, marginTop: 38, textAlign: 'center' }}>{fields.date}</div>
  </div>
  <div style={{ display: 'flex', width: 160, borderTop: `1px solid ${colors[1]}66`, marginBottom: 38 }}/>
  <div style={{ display: 'flex', padding: 12, background: '#fff', borderRadius: 6 }}><img alt="" src={qr} width={280} height={280}/></div>
  <div style={{ display: 'flex', fontSize: 22, marginTop: 24 }}>InviteIZI</div>
  {credit && <div style={{ display: 'flex', fontSize: 13, marginTop: 12, maxWidth: 940, textAlign: 'center', opacity: .65 }}>{reportText(credit)}</div>}
 </div>, { width: 1080, height: 1920, fonts: [{ name: 'Status', data: font.normal, weight: 400, style: 'normal' }, { name: 'Status', data: font.italic, weight: 400, style: 'italic' }] });
    return new Uint8Array(await response.arrayBuffer());
}
