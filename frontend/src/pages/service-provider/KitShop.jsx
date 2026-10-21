import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Minus, Package, Plus, ShieldCheck, ShoppingBag, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, resolveMediaUrl } from '../../lib/apiClient';
import { payWithRazorpay } from '../../lib/razorpayCheckout';
import { buttonClass, inputClass, Field, Timeline, money, label } from '../../components/provider-onboarding/shared';

function KitOrder({ order, refresh }) {
  const [code, setCode] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [help, setHelp] = useState('');
  const path = `/service-provider/kits/orders/${order.id}`;
  async function run(fn) { setBusy(true); setError(''); try { await fn(); await refresh(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <article className="rounded-2xl border bg-white p-5 space-y-3"><h3 className="font-bold">{order.humanId}</h3><p>{label(order.status)} · Payment: {label(order.paymentStatus)} · {money(order.total)}</p><ul>{order.items.map(i => <li key={i.kit}>{i.name} × {i.quantity}{i.qualifiesForOnboarding ? ' · Qualifying onboarding kit' : ''}</li>)}</ul><p className="text-sm text-slate-600">Ship to {order.recipient.name}, {order.recipient.house}, {order.recipient.city}, {order.recipient.state} {order.recipient.pincode}</p>{order.trackingNumber && <p>Courier: {order.courier} · Tracking: {order.trackingNumber}</p>}{error && <p role="alert" className="text-red-700">{error}</p>}{order.paymentStatus === 'Pending' && <div className="flex flex-wrap gap-3"><button disabled={busy} className={buttonClass} onClick={() => run(async () => { const result = await apiRequest(path, { auth: true }); await payWithRazorpay({ razorpay: result.razorpay, verifyPath: `${path}/verify-payment`, description: 'Provider kit order', prefill: order.recipient }); })}>Complete payment</button><button disabled={busy} className="underline" onClick={() => run(() => apiRequest(`${path}/recover-payment`, { method: 'POST', auth: true }))}>Already paid? Check payment</button></div>}{['Shipped', 'Delivered'].includes(order.status) && <form className="space-y-2" onSubmit={e => { e.preventDefault(); run(() => apiRequest(`${path}/receipt`, { method: 'POST', auth: true, body: { code } })); }}><Field title="Receipt code inside your parcel"><input className={inputClass} required value={code} onChange={e => setCode(e.target.value)} /></Field><button disabled={busy} className={buttonClass}>Verify received kit</button></form>}{order.status === 'ReceiptVerified' && <p className="text-green-800 font-medium">Receipt verified. Check My onboarding for job eligibility.</p>}<details><summary className="cursor-pointer">Delivery help and order history</summary><Timeline events={order.events} /><form className="space-y-2 mt-3" onSubmit={e => { e.preventDefault(); run(async () => { await apiRequest(`${path}/help`, { method: 'POST', auth: true, body: { reason: help } }); setHelp(''); }); }}><Field title="Describe your delivery issue"><textarea className={inputClass} required minLength={3} value={help} onChange={e => setHelp(e.target.value)} /></Field><button disabled={busy} className={buttonClass}>Request help</button></form></details></article>;
}
export default function KitShop() {
  const { user } = useAuth();
  const [kits, setKits] = useState([]), [orders, setOrders] = useState([]), [canBuy, setCanBuy] = useState(false), [loading, setLoading] = useState(true), [showCheckout, setShowCheckout] = useState(false), [quantities, setQuantities] = useState({}), [recipient, setRecipient] = useState({ name: user?.name || '', phone: user?.phone || '', house: '', landmark: '', city: '', state: '', pincode: '' }), [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const checkoutLock = useRef(false);
  const refresh = useCallback(async () => { try { const [catalog, history, journey] = await Promise.all([apiRequest('/service-provider/kits', { auth: true }), apiRequest('/service-provider/kits/orders', { auth: true }), apiRequest('/service-provider/onboarding', { auth: true })]); setKits(catalog); setQuantities(current => Object.fromEntries(catalog.map(k => [k.id, Math.min(current[k.id] || 0, k.stock, 20)]))); setOrders(history); setCanBuy(journey.canBuyKits); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, [refresh]);
  const selected = kits.filter(k => quantities[k.id] > 0);
  const subtotal = selected.reduce((sum, k) => sum + k.price * quantities[k.id], 0), shipping = selected.reduce((sum, k) => sum + k.shippingCharge * quantities[k.id], 0);
  const itemCount = selected.reduce((sum, kit) => sum + quantities[kit.id], 0);
  function setQuantity(kit, quantity) {
    if (busy || !canBuy) return;
    const value = Math.max(0, Math.min(20, kit.stock, Math.trunc(Number(quantity) || 0)));
    setQuantities(current => ({ ...current, [kit.id]: value }));
    setMessage('');
  }
  const checkoutSection = useRef(null);
  function proceedToCheckout() {
    setShowCheckout(true);
    requestAnimationFrame(() => checkoutSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  async function checkout(e) {
    e.preventDefault(); if (checkoutLock.current || !selected.length || !canBuy) return; checkoutLock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const payload = { items: selected.map(k => ({ kit: k.id, quantity: quantities[k.id] })), recipient };
      const fingerprint = JSON.stringify(payload), storageKey = `provider-kit-checkout-${user.id}`;
      let cached; try { cached = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { /* Start a new attempt if storage is corrupt. */ }
      const checkoutKey = cached?.fingerprint === fingerprint ? cached.key : crypto.randomUUID();
      sessionStorage.setItem(storageKey, JSON.stringify({ key: checkoutKey, fingerprint }));
      const result = await apiRequest('/service-provider/kits/orders', { method: 'POST', auth: true, body: { ...payload, checkoutKey } });
      if (result.order.paymentStatus === 'Failed') { sessionStorage.removeItem(storageKey); throw new Error('The checkout expired. Submit again to start a new payment.'); }
      if (result.order.paymentStatus !== 'Paid') await payWithRazorpay({ razorpay: result.razorpay, verifyPath: `/service-provider/kits/orders/${result.order.id}/verify-payment`, description: 'Nigam Care provider kits', prefill: recipient });
      sessionStorage.removeItem(storageKey); setQuantities({}); setShowCheckout(false); setMessage('Payment confirmed. Track shipping below; jobs unlock after verifying receipt of a qualifying kit.');
    } catch (err) { setError(err.message); } finally { await refresh(); checkoutLock.current = false; setBusy(false); }
  }
  return (
    <main className="min-h-screen bg-[#F5F7FB] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0D47A1]" to="/service-provider/onboarding"><ArrowLeft size={17} /> My onboarding</Link>
          <a href="#kit-cart" className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-[#0D47A1]"><ShoppingCart size={17} /> Cart <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0D47A1] px-1 text-xs text-white">{itemCount}</span></a>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#0D47A1]">Nigam Care Partner</p><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Partner kits</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Everything you need to get started, with extra tools for your everyday work.</p></div>
          <a href="#kit-orders" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0D47A1]"><Package size={17} /> My orders <ArrowRight size={16} /></a>
        </section>
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-950"><ShieldCheck className="mt-0.5 shrink-0 text-[#0D47A1]" size={21} /><p><strong>Your first step to receiving jobs.</strong> Purchase a qualifying onboarding kit, then verify the code inside your delivered parcel. Extra kits are optional.</p></div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 size={18} className="shrink-0" />{message}</p>}
        {!loading && !canBuy && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Purchasing opens after your interview and final approval.</p>}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
          <section aria-label="Available partner kits" className="grid min-w-0 gap-5 sm:grid-cols-2">
            {loading && <p className="text-sm text-slate-500">Loading partner kits…</p>}
            {!loading && kits.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Package className="mx-auto mb-3 text-slate-300" size={36} /><h2 className="font-bold">Kits are coming soon</h2><p className="mt-2 text-sm text-slate-500">Contact your area manager for availability.</p></div>}
            {kits.map(k => {
              const quantity = quantities[k.id] || 0, limit = Math.min(20, k.stock);
              return <article key={k.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className={`relative flex h-44 items-center justify-center p-6 ${k.qualifiesForOnboarding ? 'bg-gradient-to-br from-blue-50 to-indigo-100/70' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
                  {k.imageUrl ? <img className="h-full w-full object-contain" src={resolveMediaUrl(k.imageUrl)} alt={k.name} /> : <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/90 text-[#0D47A1] shadow-sm"><Package size={42} strokeWidth={1.4} /></div>}
                  {quantity > 0 && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#0D47A1] shadow-sm"><Check size={12} /> {quantity} in cart</span>}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className={`mb-3 inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold ${k.qualifiesForOnboarding ? 'bg-blue-50 text-[#0D47A1]' : 'bg-slate-100 text-slate-600'}`}>{k.qualifiesForOnboarding && <ShieldCheck size={12} />}{k.qualifiesForOnboarding ? 'Qualifying onboarding kit' : 'Optional kit'}</span>
                  <h2 className="text-lg font-bold leading-snug tracking-tight">{k.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{k.description}</p>
                  {k.contents.length > 0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inside the kit</p><ul className="mt-2 space-y-1.5">{k.contents.map(item => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><Check size={13} className="mt-1 shrink-0 text-[#0D47A1]" />{item}</li>)}</ul></div>}
                  <div className="mt-auto pt-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-2xl font-extrabold tracking-tight">{money(k.price)}</p><p className="mt-1 text-xs text-slate-400">Tax included · {k.shippingCharge ? `${money(k.shippingCharge)} shipping` : 'Free shipping'}</p></div><span className={`text-xs font-medium ${k.stock > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{k.stock > 0 ? `${k.stock} in stock` : 'Out of stock'}</span></div>
                    <button type="button" disabled={!canBuy || busy || quantity >= limit} onClick={() => setQuantity(k, quantity + 1)} aria-label={`Add ${k.name} to cart`} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D47A1] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#09377E] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><ShoppingCart size={17} />{k.stock === 0 ? 'Out of stock' : quantity >= limit ? 'Maximum added' : quantity > 0 ? 'Add another' : 'Add to cart'}</button>
                  </div>
                </div>
              </article>;
            })}
          </section>
          <aside id="kit-cart" aria-label="Your cart" className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="flex items-center gap-2 font-bold"><ShoppingBag size={18} className="text-[#0D47A1]" /> Your cart</h2><span className="text-xs text-slate-400">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span></div>
            {selected.length === 0 ? <div className="px-6 py-10 text-center"><ShoppingBag size={32} className="mx-auto text-slate-300" /><p className="mt-4 text-sm font-semibold">Your cart is empty</p><p className="mt-2 text-xs leading-5 text-slate-500">Choose a kit and select Add to cart to get started.</p></div> : <>
              <ul className="divide-y divide-slate-100 px-5">{selected.map(k => <li key={k.id} className="py-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold leading-5">{k.name}</p><button type="button" aria-label={`Remove ${k.name} from cart`} disabled={busy} onClick={() => setQuantity(k, 0)} className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-50"><Trash2 size={15} /></button></div><div className="mt-3 flex items-center justify-between gap-2"><div className="flex h-9 items-center rounded-lg border border-slate-200"><button type="button" aria-label={`Decrease quantity of ${k.name}`} disabled={busy} onClick={() => setQuantity(k, quantities[k.id] - 1)} className="px-2.5 text-slate-500 hover:text-[#0D47A1] disabled:opacity-50"><Minus size={13} /></button><input aria-label={`Quantity — ${k.name}`} type="number" min="0" max={Math.min(20, k.stock)} step="1" disabled={busy} value={quantities[k.id]} onChange={e => setQuantity(k, e.target.value)} className="h-full w-10 border-x border-slate-200 bg-transparent text-center text-xs font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /><button type="button" aria-label={`Increase quantity of ${k.name}`} disabled={busy || quantities[k.id] >= Math.min(20, k.stock)} onClick={() => setQuantity(k, quantities[k.id] + 1)} className="px-2.5 text-slate-500 hover:text-[#0D47A1] disabled:opacity-30"><Plus size={13} /></button></div><strong className="text-sm">{money(k.price * quantities[k.id])}</strong></div></li>)}</ul>
              <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-5"><div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between text-sm text-slate-500"><span>Shipping</span><span className={shipping === 0 ? 'text-emerald-700' : ''}>{shipping ? money(shipping) : 'Free'}</span></div><div className="flex justify-between border-t border-slate-200 pt-3 font-bold"><span>Total</span><span data-testid="cart-total">{money(subtotal + shipping)}</span></div><p className="text-[11px] text-slate-400">All prices include applicable taxes.</p><button type="button" disabled={busy || !canBuy} onClick={proceedToCheckout} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D47A1] px-4 py-3 text-sm font-bold text-white hover:bg-[#09377E] disabled:opacity-50">Continue to checkout <ArrowRight size={16} /></button></div>
            </>}
            <p className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400"><Truck size={14} /> Delivered to your chosen address</p>
          </aside>
        </div>
        {canBuy && showCheckout && selected.length > 0 && <section ref={checkoutSection} className="scroll-mt-6"><form onSubmit={checkout} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-5 sm:px-7"><h2 className="flex items-center gap-2 text-lg font-bold"><Truck size={20} className="text-[#0D47A1]" /> Shipping and checkout</h2><p className="mt-1 text-sm text-slate-500">Tell us where to deliver your kits.</p></div><div className="space-y-6 p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2">{Object.keys(recipient).map(field => <div key={field} className={field === 'house' ? 'sm:col-span-2' : ''}><Field title={{ name: 'Recipient name', phone: 'Shipping phone', house: 'House / street address', landmark: 'Landmark (optional)', city: 'Shipping city', state: 'Shipping state', pincode: 'Pincode' }[field]}><input className={`${inputClass} min-w-0 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100`} disabled={busy} required={field !== 'landmark'} value={recipient[field]} type={field === 'phone' ? 'tel' : 'text'} inputMode={['phone', 'pincode'].includes(field) ? 'numeric' : undefined} pattern={field === 'phone' ? '[0-9]{10}' : field === 'pincode' ? '[0-9]{6}' : undefined} maxLength={field === 'phone' ? 10 : field === 'pincode' ? 6 : undefined} onChange={e => setRecipient({ ...recipient, [field]: e.target.value })} /></Field></div>)}</div><div className="flex flex-col justify-between gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center"><div><p className="text-xs text-slate-500">{itemCount} {itemCount === 1 ? 'item' : 'items'} · {shipping ? `${money(shipping)} shipping included` : 'Free shipping'}</p><p className="mt-1 text-xl font-extrabold">{money(subtotal + shipping)}</p></div><button className="flex items-center justify-center gap-2 rounded-xl bg-[#0D47A1] px-6 py-3 text-sm font-bold text-white hover:bg-[#09377E] disabled:opacity-50" disabled={busy}><ShieldCheck size={17} />{busy ? 'Preparing payment…' : 'Pay for kits'}</button></div></div></form></section>}
        <section id="kit-orders" className="scroll-mt-6 space-y-4 border-t border-slate-200 pt-8"><div className="flex items-center gap-2"><Package size={21} className="text-[#0D47A1]" /><h2 className="text-xl font-bold tracking-tight">My kit orders</h2></div>{orders.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center"><p className="text-sm font-semibold text-slate-600">No orders yet</p><p className="mt-1 text-xs text-slate-400">Your purchases and delivery updates will appear here.</p></div>}<div className="grid gap-4 md:grid-cols-2">{orders.map(order => <KitOrder key={order.id} order={order} refresh={refresh} />)}</div></section>
      </div>
    </main>
  );
}
