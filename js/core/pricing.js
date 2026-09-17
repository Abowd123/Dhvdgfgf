/* ═══ تسعير حصر الكميات ═══ */
const CFG = { currency: "ر.س", taxRate: 0.15, key: "mistar:pricing" };
const DEFAULTS = {
  wall: { label: "جدران", unit: "م²", rate: 120 },
  floor: { label: "أرضيات", unit: "م²", rate: 90 },
  area: { label: "مساحات", unit: "م²", rate: 0 },
  door: { label: "أبواب", unit: "عدد", rate: 350 },
  window: { label: "نوافذ", unit: "عدد", rate: 420 },
  column: { label: "أعمدة", unit: "عدد", rate: 250 },
  dim: { label: "أبعاد", unit: "عدد", rate: 0 }
};
let RATES = load();
function load() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(CFG.key)) || {}) }; }
  catch (_) { return { ...DEFAULTS }; }
}
function persist() { try { localStorage.setItem(CFG.key, JSON.stringify(RATES)); } catch (_) {} }
export const getRate = key => RATES[key]?.rate ?? 0;
export const allRates = () => JSON.parse(JSON.stringify(RATES));
export function setRate(key, rate, meta = {}) { RATES[key] = { ...(RATES[key] || {}), ...meta, rate: +rate || 0 }; persist(); }
export function resetRates() { RATES = { ...DEFAULTS }; try { localStorage.removeItem(CFG.key); } catch (_) {} }
export const currency = () => CFG.currency;
export const setCurrency = c => { if (c) CFG.currency = c; };
export const taxRate = () => CFG.taxRate;
export const setTaxRate = r => { CFG.taxRate = Math.max(0, +r || 0); };
export const round2 = n => Math.round((+n + Number.EPSILON) * 100) / 100;
export const formatMoney = n => `${round2(n).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CFG.currency}`;
export function price(items) {
  const rows = (items || []).map(it => {
    const def = RATES[it.key] || {};
    const rate = it.rate ?? def.rate ?? 0;
    const qty = +it.qty || 0;
    return { key: it.key, label: it.label || def.label || it.key, unit: it.unit || def.unit || "", qty, rate, amount: round2(qty * rate) };
  });
  const subtotal = round2(rows.reduce((s, r) => s + r.amount, 0));
  const tax = round2(subtotal * CFG.taxRate);
  return { rows, subtotal, tax, total: round2(subtotal + tax), currency: CFG.currency, taxRate: CFG.taxRate };
}
export const toJSON = () => ({ currency: CFG.currency, taxRate: CFG.taxRate, rates: RATES });
export function fromJSON(d) {
  if (!d) return;
  if (d.currency) CFG.currency = d.currency;
  if (typeof d.taxRate === "number") CFG.taxRate = Math.max(0, d.taxRate);
  if (d.rates) RATES = { ...DEFAULTS, ...d.rates };
}