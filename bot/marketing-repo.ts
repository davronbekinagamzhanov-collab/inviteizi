import { env } from "@/lib/env";
/** Server-only transactional additions to existing orders, partners and bot_notices. No external side effects here. */
import { randomBytes, randomUUID } from 'node:crypto';
import type { Sql, Tx } from '@/lib/db';
import type { Repo } from './repo';
import { validPublicSource, INVITATION_CODE, PARTNER_CODE, referralReward } from '@/lib/marketing/config';
export class MarketingError extends Error {
    constructor(public readonly code: string) { super(code); this.name = 'MarketingError'; }
}
export type DeliveryJob = {
    key: string;
    chatId: number;
    body: {
        text: string;
        markup?: unknown;
        kind?: string;
        orderId?: string;
    };
    token: string;
    attempts: number;
};
const payable = ['draft', 'preview', 'awaiting_payment', 'rejected'];
const validId = (s: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);
const codeOf = (s: string) => s.trim().toUpperCase();
export class PgMarketing {
    constructor(private sql: Sql, private repo: Repo) { }
    async ready() { const [r] = await this.sql `select to_regclass('public.marketing_audit') is not null and to_regclass('public.marketing_command_limits') is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name='bot_notices' and column_name='sending_at') as ready`; return !!r.ready; }
    private async owner(id: number) {
        if (!await this.repo.isOwner(id))
            throw new MarketingError('forbidden');
    }
    private async audit(tx: Tx, key: string, kind: string, actor: number | null, order: string | null, facts: Record<string, unknown> = {}) { await tx `insert into public.marketing_audit(event_key,kind,actor_id,order_id,facts) values(${key},${kind},${actor},${order},${tx.json(facts as never)}) on conflict(event_key) do nothing`; }
    private async partner(tx: Tx, userId: number) {
        const [p] = await tx `insert into public.partners(code,name,rate,customer_user_id,status,schedule,owner_notified_at) values(${randomBytes(12).toString('hex')},${'Покупатель #' + userId},${referralReward()},${userId},'active','weekly',now()) on conflict(customer_user_id) do update set customer_user_id=excluded.customer_user_id returning id,code,rate`;
        return p;
    }
    /** First valid eligible attribution wins before the first order. Existing valid commercial source takes priority. */
    async capture(userId: number, source: string) {
        if (!validPublicSource(source) || (await this.repo.staffIds()).includes(userId))
            return false;
        return this.sql.begin(async (tx) => {
            const [u] = await tx `select source from public.users where id=${userId} for update`;
            if (!u)
                return false;
            if ((await tx `select user_id from public.marketing_attributions where user_id=${userId}`).length)
                return false;
            if ((await tx `select id from public.orders where user_id=${userId} limit 1`).length)
                return false;
            let preferred = source;
            const legacyCode = PARTNER_CODE.exec(u.source ?? '')?.[1];
            if (legacyCode && (await tx `select id from public.partners where code=${legacyCode} and status<>'rejected'`).length)
                preferred = u.source;
            let p, sourceOrder: string | null = null;
            if (INVITATION_CODE.test(preferred)) {
                const [o] = await tx `select id,user_id from public.orders where public_referral_code=${preferred.slice(4)} and status='active' and paid_at is not null and amount>0 and marketing_refunded_at is null`;
                if (!o || Number(o.user_id) === userId)
                    return false;
                p = await this.partner(tx, Number(o.user_id));
                sourceOrder = o.id;
            }
            else {
                const code = PARTNER_CODE.exec(preferred)?.[1];
                if (!code)
                    return false;
                [p] = await tx `select id,code,telegram_id,customer_user_id from public.partners where code=${code} and status<>'rejected'`;
            }
            if (!p || Number(p.telegram_id) === userId || Number(p.customer_user_id) === userId)
                return false;
            const [inserted] = await tx `insert into public.marketing_attributions(user_id,partner_id,source_order_id) values(${userId},${p.id},${sourceOrder}) on conflict(user_id) do nothing returning user_id`;
            if (!inserted)
                return false;
            await tx `update public.users set source=${'p_' + p.code} where id=${userId}`;
            return true;
        });
    }
    async createPromo(actor: number, raw: string, percent: number, limit: number, expiresAt: Date | null, name = raw) {
        await this.owner(actor);
        if (!name.trim() || name.trim().length > 80)
            throw new MarketingError('invalid_promo_name');
        const code = codeOf(raw);
        if (!/^[A-Z0-9_]{3,32}$/.test(code) || !Number.isInteger(percent) || percent < 1 || percent > 100 || !Number.isInteger(limit) || limit < 1 || limit > 100000 || (expiresAt && !Number.isFinite(+expiresAt)))
            throw new MarketingError('invalid_promo');
        return this.sql.begin(async (tx) => {
            const [p] = await tx `insert into public.promotion_codes(code,name,discount_percent,usage_limit,expires_at,created_by) values(${code},${name.trim()},${percent},${limit},${expiresAt},${actor}) on conflict(code) do nothing returning id`;
            if (!p)
                throw new MarketingError('promo_exists');
            await this.audit(tx, 'promo:create:' + p.id, 'promo_created', actor, null, { code, percent, limit });
            return code;
        });
    }
    async disablePromo(actor: number, raw: string) {
        await this.owner(actor);
        return this.sql.begin(async tx=>{
            const[p]=await tx`update public.promotion_codes set enabled=false where code=${codeOf(raw)} returning id`;
            if(p)await this.audit(tx,'promo:disable:'+p.id,'promo_disabled',actor,null);
            return !!p;
        });
    }
    async noticeSent(key:string){const[r]=await this.sql`select sent_at from public.bot_notices where key=${key}`;return !!r?.sent_at;}
    async promoStats(actor: number) { await this.owner(actor); return this.sql `select p.code,p.name,p.discount_percent,p.usage_limit,p.enabled,p.expires_at,count(r.order_id) filter(where r.state='consumed')::int as used,count(r.order_id) filter(where r.state='receipt' or(r.state='reserved' and r.expires_at>now()))::int as reserved from public.promotion_codes p left join public.promotion_reservations r on r.promo_id=p.id group by p.id order by p.created_at desc limit 10`; }
    /** Order then coupon row lock: count includes every consumed/receipt/live reservation, never speculative client state. */
    async reservePromo(userId: number, orderId: string, raw: string, now: Date) {
        if (!validId(orderId))
            throw new MarketingError('order_missing');
        return this.sql.begin(async (tx) => {
            const [o] = await tx `select id,status,amount,marketing_original_amount from public.orders where id=${orderId} and user_id=${userId} for update`;
            if (!o || !payable.includes(o.status))
                throw new MarketingError('order_locked');
            const [p] = await tx `select * from public.promotion_codes where code=${codeOf(raw)} for update`;
            if (!p || !p.enabled || (p.expires_at && +p.expires_at <= +now))
                throw new MarketingError('promo_unavailable');
            const [old] = await tx `select * from public.promotion_reservations where order_id=${orderId}`;
            if (old && old.state === 'reserved' && +old.expires_at > +now) {
                if (old.promo_id !== p.id)
                    throw new MarketingError('promo_already_reserved');
                return { amount: Number(old.discounted_amount), expiresAt: old.expires_at };
            }
            const [{ used }] = await tx `select count(*)::int as used from public.promotion_reservations where promo_id=${p.id} and(state in('consumed','receipt') or(state='reserved' and expires_at>${now}))`;
            if (used >= p.usage_limit)
                throw new MarketingError('promo_exhausted');
            const original = Number(o.marketing_original_amount ?? o.amount), amount = Math.floor(original * (100 - p.discount_percent) / 100), expiry = new Date(+now + 30 * 60000);
            await tx `insert into public.promotion_reservations(order_id,promo_id,original_amount,discounted_amount,state,expires_at) values(${orderId},${p.id},${original},${amount},'reserved',${expiry}) on conflict(order_id) do update set promo_id=excluded.promo_id,original_amount=excluded.original_amount,discounted_amount=excluded.discounted_amount,state='reserved',expires_at=excluded.expires_at,consumed_at=null`;
            await tx `update public.orders set marketing_original_amount=${original},amount=${amount},pay_confirmed_at=null,terms_accepted_at=null where id=${orderId}`;
            return { amount, expiresAt: expiry };
        });
    }
    private async enqueue(tx: Tx, order: {
        id: string;
        user_id: number;
        slug: string;
    }, baseUrl: string, now: Date, kinds: string[]) {
        for (const kind of kinds) {
            await tx `insert into public.bot_notices(key,chat_id,body,due_at) values(${'mk:' + kind + ':' + order.id},${order.user_id},${tx.json({ kind, orderId: order.id, text: baseUrl + '/' + order.slug })},${now}) on conflict(key) do nothing`;
        }
    }
    /** Cash and promotion fulfillment are separate audited transitions. Called only after explicit admin/owner verification or customer promo consent. */
    async confirm(orderId: string, actor: number, now: Date, baseUrl: string, kind: 'kaspi' | 'promotion', expiresAt: Date | null, features: {
        referrals?: boolean;
        status?: boolean;
        edits?: boolean;
    } = {}) {
        if (kind === 'kaspi' && !await this.repo.isAdmin(actor))
            throw new MarketingError('forbidden');
        const staff = await this.repo.staffIds();
        return this.sql.begin(async (tx) => {
            const [o] = await tx `select * from public.orders where id=${orderId} for update`;
            if (!o || o.marketing_refunded_at)
                return null;
            if (kind === 'kaspi' && o.status !== 'receipt_sent' || kind === 'promotion' && (!payable.includes(o.status) || Number(o.user_id) !== actor))
                return null;
            const [r] = await tx `select r.*,p.enabled,p.expires_at as code_expiry from public.promotion_reservations r join public.promotion_codes p on p.id=r.promo_id where r.order_id=${orderId} and r.state<>'released' for update of p,r`;
            if (kind === 'promotion' && (!r || r.state !== 'reserved' || +r.expires_at <= +now || !r.enabled || (r.code_expiry && +r.code_expiry <= +now) || r.discounted_amount !== 0 || o.amount !== 0))
                throw new MarketingError('promo_unavailable');
            if (kind === 'kaspi' && o.amount <= 0)
                throw new MarketingError('zero_cash_payment');
            if (r) {
                if (r.discounted_amount !== o.amount || !['receipt', 'reserved'].includes(r.state))
                    throw new MarketingError('promo_unavailable');
                await tx `update public.promotion_reservations set state='consumed',consumed_at=${now},expires_at=null where order_id=${orderId}`;
            }
            const code = randomBytes(16).toString('hex');
            await tx `update public.orders set status='active',paid_at=${kind === 'kaspi' ? now : null},expires_at=${expiresAt},marketing_payment_kind=${kind},marketing_confirmed_by=${actor},public_referral_code=coalesce(public_referral_code,${code}),pay_confirmed_at=coalesce(pay_confirmed_at,${now}),terms_accepted_at=coalesce(terms_accepted_at,${now}) where id=${orderId}`;
            await this.audit(tx, 'payment:' + orderId, kind === 'kaspi' ? 'payment_confirmed' : 'promotion_fulfilled', actor, orderId, { amount: o.amount, method: kind });
            if (kind === 'kaspi' && !staff.includes(Number(o.user_id))) {
                let partnerId = o.marketing_source_partner_id;
                if (!partnerId) {
                    const [u] = await tx `select source from public.users where id=${o.user_id}`;
                    const legacy = PARTNER_CODE.exec(u?.source ?? '')?.[1];
                    if (legacy) {
                        const [p] = await tx `select id from public.partners where code=${legacy}`;
                        partnerId = p?.id;
                    }
                }
                const employee = (await tx `select order_id from public.client_orders where order_id=${orderId}`).length > 0;
                if (partnerId && !employee) {
                    const [p] = await tx `select * from public.partners where id=${partnerId} for update`;
                    const [u] = await tx `select username from public.users where id=${o.user_id}`;
                    if (p && p.status !== 'rejected' && Number(p.telegram_id) !== Number(o.user_id) && Number(p.customer_user_id) !== Number(o.user_id) && (!p.username || p.username.toLowerCase() !== u?.username?.toLowerCase())) {
                        const [a] = await tx `select * from public.marketing_attributions where user_id=${o.user_id} for update`;
                        if (!p.customer_user_id || features.referrals && a && !a.first_reward_order_id) {
                            const amount = p.rate_percent == null ? (p.customer_user_id || r ? Math.min(p.rate, o.amount) : p.rate) : Math.round(o.amount * p.rate_percent / 100);
                            const [e] = await tx `insert into public.partner_earnings(order_id,partner_id,amount) values(${orderId},${p.id},${amount}) on conflict(order_id) do nothing returning order_id`;
                            if (e && p.customer_user_id)
                                await tx `update public.marketing_attributions set first_reward_order_id=${orderId} where user_id=${o.user_id}`;
                        }
                    }
                }
            }
            await this.enqueue(tx, { id: String(o.id), user_id: Number(o.user_id), slug: String(o.slug) }, baseUrl, now, ['paid_pack', ...(features.referrals || features.edits ? ['referral'] : []), ...(features.status ? ['status'] : [])]);
            return orderId;
        });
    }
    async referralStats(userId: number) {
        let [p] = await this.sql `select id,code,rate from public.partners where customer_user_id=${userId}`;
        if (!p) {
            const [eligible] = await this.sql `select id from public.orders where user_id=${userId} and status in('active','archived') and paid_at is not null and amount>0 and marketing_refunded_at is null limit 1`;
            if (!eligible)
                return null;
            await this.partner(this.sql, userId);
            [p] = await this.sql `select id,code,rate from public.partners where customer_user_id=${userId}`;
        }
        if (!p)
            return null;
        const [e] = await this.sql `select count(distinct o.user_id)::int as friends,coalesce(sum(e.amount),0)::bigint as earned from public.partner_earnings e join public.orders o on o.id=e.order_id where e.partner_id=${p.id} and o.amount>0 and o.marketing_refunded_at is null`;
        const [b] = await this.sql `select coalesce(sum(amount),0)::bigint as paid from public.partner_payouts where partner_id=${p.id}`;
        return { code: p.code, rate: Number(p.rate), friends: Number(e.friends), earned: Number(e.earned), paid: Number(b.paid), due: Number(e.earned) - Number(b.paid) };
    }
    async publicCode(orderId: string) { await this.sql `update public.orders set public_referral_code=${randomBytes(16).toString('hex')} where id=${orderId} and public_referral_code is null and status='active' and paid_at is not null and amount>0 and marketing_refunded_at is null`; const [o] = await this.sql `select public_referral_code from public.orders where id=${orderId} and status='active' and paid_at is not null and amount>0 and marketing_refunded_at is null`; return o?.public_referral_code ? 'inv_' + o.public_referral_code : null; }
    async recipientForPartner(partnerId: number) { const [p] = await this.sql `select customer_user_id from public.partners where id=${partnerId}`; return p?.customer_user_id ? Number(p.customer_user_id) : null; }
    /** Owner records an actual refund; this never initiates a bank transfer. Original quote and audit remain. */
    async refund(actor: number, orderId: string, reason: string, now: Date) {
        await this.owner(actor);
        if (!reason.trim() || reason.length > 300)
            throw new MarketingError('refund_reason_required');
        return this.sql.begin(async (tx) => {
            const [o] = await tx `select * from public.orders where id=${orderId} for update`;
            if (!o || !['active', 'archived'].includes(o.status) || o.marketing_refunded_at)
                return false;
            const [e] = await tx `select partner_id,amount from public.partner_earnings where order_id=${orderId}`;
            if (e) {
                await tx `select id from public.partners where id=${e.partner_id} for update`;
                await tx `update public.partner_earnings set amount=0 where order_id=${orderId}`;
            }
            await tx `update public.orders set marketing_refunded_at=${now},status='archived',expires_at=least(coalesce(expires_at,${now}),${now}) where id=${orderId}`;
            await this.audit(tx, 'refund:' + orderId, 'refund', actor, orderId, { amount: o.amount, commissionReversed: Number(e?.amount ?? 0), reason: reason.trim() });
            await tx `update public.bot_notices set dead_at=${now},last_error_code='order_refunded',lease_token=null,lease_until=null where key like ${'mk:%:' + orderId} and sent_at is null`;
            return true;
        });
    }
    async requestEdit(userId: number, orderId: string, key: string, body: string, now: Date) {
        if (!body.trim() || body.length > 600 || key.length > 120 || !key)
            throw new MarketingError('invalid_edit');
        const owner = env.ownerId();
        if (!owner)
            throw new MarketingError('owner_not_configured');
        return this.sql.begin(async (tx) => {
            const [o] = await tx `select id,number,status,coalesce(marketing_issued_at,case when marketing_payment_kind is null then coalesce(paid_at,created_at) end) as marketing_issued_at,marketing_refunded_at from public.orders where id=${orderId} and user_id=${userId} for update`;
            if (!o || o.status !== 'active' || !o.marketing_issued_at || o.marketing_refunded_at)
                throw new MarketingError('order_locked');
            const [repeat] = await tx `select id,fee,state from public.order_edit_requests where request_key=${key} and user_id=${userId} and order_id=${orderId}`;
            if (repeat)
                return repeat;
            const [prior] = await tx `select id,fee,state from public.order_edit_requests where order_id=${orderId} and fee=0 and state in('pending','applied')`;
            if (prior?.state === 'pending')
                return prior;
            const fee = !prior && +now >= +o.marketing_issued_at && +now - +o.marketing_issued_at <= 86400000 ? 0 : 2000;
            const [r] = await tx `insert into public.order_edit_requests(order_id,user_id,request_key,body,fee,created_at) values(${orderId},${userId},${key},${body.trim()},${fee},${now}) returning id,fee,state`;
            await this.audit(tx, 'edit:request:' + r.id, 'edit_requested', userId, orderId, { fee });
            await tx `insert into public.bot_notices(key,chat_id,body,due_at) values(${'mk:edit:' + r.id},${owner},${tx.json({ text: (fee === 0 ? 'БЕСПЛАТНАЯ' : 'ПЛАТНАЯ · 2 000 ₸') + ' · #' + o.number + ' · ' + r.id + '\n' + body.trim() })},${now}) on conflict(key) do nothing`;
            return r;
        });
    }
    async decideEdit(actor: number, id: string, applied: boolean, now: Date) {
        await this.owner(actor);
        if (!validId(id))
            throw new MarketingError('invalid_edit');
        if (applied)
            throw new MarketingError('use_correction_apply');
        return this.sql.begin(async (tx) => {
            const [r] = await tx `update public.order_edit_requests set state=${applied ? 'applied' : 'rejected'},decided_at=${now},decided_by=${actor} where id=${id} and state='pending' returning order_id,fee`;
            if (!r)
                return false;
            await this.audit(tx, 'edit:decide:' + id, applied ? 'edit_applied' : 'edit_rejected', actor, r.order_id, { fee: r.fee });
            return true;
        });
    }
    async applyDateEdit(actor: number, id: string, date: string, time: string, index: number, now: Date, paidConfirmed = false) {
        await this.owner(actor);
        if (!validId(id))
            throw new MarketingError('invalid_edit');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isInteger(index) || index < 0 || index > 2)
            throw new MarketingError('invalid_date');
        return this.sql.begin(async (tx) => {
            const [request] = await tx `select order_id from public.order_edit_requests where id=${id}`;
            if (!request)
                return false;
            const [o] = await tx `select id,status from public.orders where id=${request.order_id} for update`;
            if (!o || o.status !== 'active')
                return false;
            const [r] = await tx `select * from public.order_edit_requests where id=${id} and state='pending' for update`;
            if (!r)
                return false;
            if (r.fee > 0 && !paidConfirmed)
                throw new MarketingError('edit_fee_confirmation_required');
            const [e] = await tx `update public.events set date=${date},time=${time} where order_id=${r.order_id} and position=${index} returning id`;
            if (!e)
                throw new MarketingError('event_missing');
            await tx `update public.orders set expires_at=(select (max(date)::text||'T23:59:59+05:00')::timestamptz+interval '30 days' from public.events where order_id=${r.order_id}) where id=${r.order_id}`;
            await tx `update public.order_edit_requests set state='applied',decided_at=${now},decided_by=${actor} where id=${id}`;
            await this.audit(tx, 'edit:decide:' + id, 'edit_applied', actor, r.order_id, { fee: r.fee, event: index, date, time, paidConfirmed });
            return true;
        });
    }
    async pendingEdits(actor: number) { await this.owner(actor); return this.sql `select e.id,e.order_id,e.user_id,e.body,e.fee,e.created_at,o.number from public.order_edit_requests e join public.orders o on o.id=e.order_id where e.state='pending' order by e.created_at limit 5`; }
    /** Lease and ack are separate. Unique job key prevents webhook replay from adding another job. */
    async claimJobs(now: Date, limit = 10): Promise<DeliveryJob[]> { await this.sql `update public.bot_notices set dead_at=${now},last_error_code='ambiguous_status_send',lease_token=null,lease_until=null where sent_at is null and dead_at is null and lease_until<${now} and sending_at is not null and body->>'kind'='status'`; const token = randomUUID(), until = new Date(+now + 120000); const rows = await this.sql `update public.bot_notices set lease_token=${token},lease_until=${until},attempts=attempts+1 where key in(select key from public.bot_notices where sent_at is null and dead_at is null and due_at<=${now} and(lease_until is null or lease_until<${now}) and attempts<5 and(coalesce(body->>'kind','message') not in('referral','status') or exists(select 1 from public.orders o where o.id=(body->>'orderId')::uuid and o.marketing_issued_at is not null and o.status='active' and o.marketing_refunded_at is null)) order by due_at,key limit ${Math.min(20, Math.max(1, limit))} for update skip locked) returning key,chat_id,body,attempts`; return rows.map(r => ({ key: r.key, chatId: Number(r.chat_id), body: r.body, token, attempts: r.attempts })); }
    async markSending(job: DeliveryJob, now: Date) { return (await this.sql `update public.bot_notices set sending_at=${now} where key=${job.key} and lease_token=${job.token} and sent_at is null and(dead_at is null) returning key`).length > 0; }
    async deferJob(job: DeliveryJob, now: Date) { await this.sql `update public.bot_notices set attempts=greatest(0,attempts-1),lease_token=null,lease_until=null,due_at=${new Date(+now + 1000)} where key=${job.key} and lease_token=${job.token} and sent_at is null`; }
    async ackJob(job: DeliveryJob, now: Date, messageId?: number) {
        return this.sql.begin(async (tx) => {
            const [r] = await tx `update public.bot_notices set sent_at=${now},lease_token=null,lease_until=null,remote_message_id=${messageId ?? null},last_error_code=null,sending_at=null where key=${job.key} and lease_token=${job.token} and sent_at is null returning key`;
            if (!r)
                return false;
            if (job.body.kind === 'paid_pack' && job.body.orderId) {
                await tx `update public.orders set marketing_issued_at=coalesce(marketing_issued_at,${now}) where id=${job.body.orderId}`;
                await this.audit(tx, 'delivery:' + job.body.orderId, 'delivery_ack', null, job.body.orderId);
            }
            return true;
        });
    }
    async failJob(job: DeliveryJob, now: Date, code: string, ambiguous = false) {
        const safe = /^[a-z0-9_]{1,80}$/.test(code) ? code : 'delivery_error';
        await this.sql `update public.bot_notices set lease_token=null,lease_until=null,sending_at=null,due_at=${new Date(+now + Math.min(3600000, 30000 * 2 ** job.attempts))},dead_at=${ambiguous || job.attempts >= 5 ? now : null},last_error_code=${safe} where key=${job.key} and lease_token=${job.token} and sent_at is null`;
        if (ambiguous)
            await this.audit(this.sql, 'ambiguous:' + job.key + ':' + job.attempts, 'delivery_ambiguous', null, job.body.orderId ?? null, { kind: job.body.kind ?? 'message' });
    }
    async releaseExpired(now: Date, orderId: string | null = null) {
        return this.sql.begin(async (tx) => {
            const rows = await tx `select o.id,r.original_amount from public.orders o join public.promotion_reservations r on r.order_id=o.id where (${orderId}::uuid is null or o.id=${orderId}) and r.state='reserved' and r.expires_at<=${now} and o.status in('preview','draft','awaiting_payment','rejected') for update of o skip locked`;
            for (const r of rows) {
                await tx `update public.orders set amount=${r.original_amount},pay_confirmed_at=null,terms_accepted_at=null where id=${r.id}`;
                await tx `update public.promotion_reservations set state='released',expires_at=null where order_id=${r.id} and state='reserved'`;
            }
            return rows.length;
        });
    }
    async markIssued(orderId: string, now: Date, messageId?: number) {
        return this.sql.begin(async (tx) => {
            const [o] = await tx `update public.orders set marketing_issued_at=${now} where id=${orderId} and status='active' and marketing_payment_kind is not null and marketing_issued_at is null returning id`;
            if (!o)
                return false;
            await this.audit(tx, 'delivery:' + orderId, 'delivery_ack', null, orderId, { channel: 'manual_telegram', messageId: messageId ?? null });
            return true;
        });
    }
    async issuance(orderId: string) { const [o] = await this.sql `select marketing_issued_at,marketing_refunded_at,marketing_payment_kind from public.orders where id=${orderId}`; return o ?? null; }
    async allowCommand(userId: number, now: Date) { const minute = new Date(Math.floor(+now / 60000) * 60000); return (await this.sql `insert into public.marketing_command_limits(user_id,minute,count) values(${userId},${minute},1) on conflict(user_id,minute) do update set count=marketing_command_limits.count+1 where marketing_command_limits.count<10 returning count`).length > 0; }
    async markUpdate(userId: number, updateId: number) { await this.sql `update public.users set state=jsonb_set(state,'{handledUpdates}',(select coalesce(jsonb_agg(value order by n),'[]'::jsonb) from(select value,max(n) as n from jsonb_array_elements((case when jsonb_typeof(state->'handledUpdates')='array' then state->'handledUpdates' else '[]'::jsonb end)||to_jsonb(${updateId}::bigint)) with ordinality entries(value,n) group by value order by max(n) desc limit 64) bounded)) where id=${userId}`; }
    async queueDeliveryAlert(now: Date) {
        const owner = env.ownerId();
        if (!owner)
            return;
        const [r] = await this.sql `select count(*)::int as n from public.bot_notices where sent_at is null and (dead_at is not null or attempts>=5)`;
        if (!r.n)
            return;
        const day = new Date(+now + 5 * 3600000).toISOString().slice(0, 10);
        await this.sql `insert into public.bot_notices(key,chat_id,body,due_at) values(${'mk:delivery-alert:' + day},${owner},${this.sql.json({ text: 'InviteIZI: ' + r.n + ' сообщений требуют проверки доставки. /delivery — причины, /delivery_retry KEY — повтор после проверки. Платежи сохранены.' })},${now}) on conflict(key) do nothing`;
    }
    async deliveryProblems(actor: number) { await this.owner(actor); return this.sql `select key,chat_id,attempts,last_error_code from public.bot_notices where sent_at is null and(dead_at is not null or attempts>=5) order by due_at desc limit 10`; }
    async retryDelivery(actor: number, key: string, now: Date) { await this.owner(actor); return (await this.sql `update public.bot_notices set dead_at=null,attempts=0,lease_token=null,lease_until=null,sending_at=null,due_at=${now},last_error_code=null where key=${key} and sent_at is null and(dead_at is not null or lease_until<${now}) returning key`).length > 0; }
}
