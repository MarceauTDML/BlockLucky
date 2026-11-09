import { findEvent } from '../data/events.js';
import { BILLETTERIE, findTicket } from '../data/content.js';
import { $$, storage } from './utils.js';

const KEY = 'etherbay.cart';
const ORDERS_KEY = 'etherbay.orders';
const MAX_QTY = 20;

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const ticketDateRange = (ticket, today = new Date()) => {
  const todayIso = isoDay(today);
  const event = ticket.event ? findEvent(ticket.event) : null;
  const start = event && event.start > todayIso ? event.start : todayIso;
  const end = event ? event.end : ticket.validUntil;
  return { min: start, max: end, available: start <= end };
};

export const defaultDate = (ticket) => ticketDateRange(ticket).min;

export const getCart = () => {
  const raw = storage.get(KEY, {});
  const cart = {};
  Object.entries(raw || {}).forEach(([id, line]) => {
    const ticket = findTicket(id);
    if (!ticket) return;
    const qty = typeof line === 'number' ? line : Number(line?.qty) || 0;
    if (qty <= 0) return;
    const range = ticketDateRange(ticket);
    let date = typeof line === 'object' && line?.date ? line.date : range.min;
    if (date < range.min || date > range.max) date = range.min;
    cart[id] = { qty: Math.min(qty, MAX_QTY), date };
  });
  return cart;
};

const save = (cart) => {
  storage.set(KEY, cart);
  updateCartCount();
  document.dispatchEvent(new CustomEvent('cart:change', { detail: cart }));
  return cart;
};

export const setQuantity = (id, qty) => {
  const cart = getCart();
  const ticket = findTicket(id);
  if (!ticket) return cart;
  const next = Math.max(0, Math.min(MAX_QTY, qty));
  if (next === 0) delete cart[id];
  else cart[id] = { qty: next, date: cart[id]?.date || defaultDate(ticket) };
  return save(cart);
};

export const addToCart = (id, qty = 1) => setQuantity(id, (getCart()[id]?.qty || 0) + qty);

export const setDate = (id, date) => {
  const cart = getCart();
  if (cart[id]) cart[id].date = date;
  return save(cart);
};

export const clearCart = () => save({});

export const cartLines = (cart = getCart()) =>
  BILLETTERIE.filter((t) => cart[t.id]).map((t) => ({ ticket: t, qty: cart[t.id].qty, date: cart[t.id].date, total: t.amount * cart[t.id].qty }));

export const cartTotals = (lines = cartLines()) => ({
  count: lines.reduce((s, l) => s + l.qty, 0),
  amount: lines.reduce((s, l) => s + l.total, 0),
});

export const updateCartCount = () => {
  const { count } = cartTotals();
  $$('[data-cart-count]').forEach((el) => {
    el.textContent = String(count);
    el.hidden = count === 0;
  });
};

export const euro = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export const getOrders = () => storage.get(ORDERS_KEY, []);

export const findOrder = (number) => getOrders().find((o) => o.number === number);

export const saveOrder = (order) => {
  storage.set(ORDERS_KEY, [order, ...getOrders()].slice(0, 20));
  return order;
};

export const createOrderNumber = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  window.crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `EB-${new Date().getFullYear()}-${code}`;
};
