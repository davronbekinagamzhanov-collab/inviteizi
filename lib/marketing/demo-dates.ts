import type { InvitationData } from '@/lib/types';
const DAY = 86400000;
/** Only call for catalogue sample data. Never call on orders or saved client dates. */
export function futureDemoData(sample: InvitationData, now: Date, days = 45): InvitationData {
    if (!Number.isFinite(+now) || !Number.isInteger(days) || days < 1)
        throw new Error('Invalid demo clock');
    if (!sample.events.length)
        return { ...sample, events: [] };
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const first = Math.min(...sample.events.map(e => Date.parse(e.date + 'T00:00:00Z'))), target = Date.parse(today + 'T00:00:00Z') + days * DAY;
    return { ...sample, events: sample.events.map(e => ({ ...e, date: new Date(Date.parse(e.date + 'T00:00:00Z') + target - first).toISOString().slice(0, 10), ...(e.location ? { location: { ...e.location } } : {}) })) };
}
