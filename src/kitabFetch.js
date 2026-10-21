// Mengambil satu halaman teks kitab dari situs perpustakaan online yang diizinkan.
// Dipicu pengguna (satu tautan per permintaan), bukan perayap. Teks dikembalikan untuk diperiksa
// dan disunting pengguna sebelum dipakai, beserta tautan sumber.
import { ApiError, MAX_TEKS } from './soalService.js';

export const DEFAULT_HOSTS = ['shamela.ws', 'al-maktaba.org', 'islamweb.net', 'ar.wikisource.org', 'archive.org', 'ketabonline.com'];

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LETTER = /\p{L}/u;

export const arabicRatio = (str) => {
  let l = 0; let a = 0;
  for (const ch of str) if (LETTER.test(ch)) { l++; if (ARABIC.test(ch)) a++; }
  return l ? a / l : 0;
};

/** Rapikan tautan tempelan: buang spasi/tanda kutip, tambahkan https:// bila hanya berupa \"shamela.ws/book/1/2\", ubah http:// menjadi https://. */
export function normalisasiUrl(raw) {
  let t = String(raw || '').trim().replace(/^[\s"'<(]+|[\s"'>).,;]+$/g, '').split(/\s+/)[0] || '';
  if (/^http:\/\//i.test(t)) t = 'https://' + t.slice(7);
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(t) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(t)) t = 'https://' + t;
  return t;
}

export const hostAllowed = (host, allowed) => allowed.some((h) => host === h || host.endsWith('.' + h));

/** Validasi tautan: https, tanpa kredensial, port standar, domain di daftar izin. */
export function parseKitabUrl(raw, allowed) {
  let u;
  try { u = new URL(normalisasiUrl(raw)); } catch { throw new ApiError(422, 'URL_INVALID', 'Tautan tidak valid. Tempel alamat lengkap yang diawali https://'); }
  if (u.protocol !== 'https:') throw new ApiError(422, 'URL_INVALID', 'Hanya tautan https:// yang diterima.');
  if (u.username || u.password || (u.port && u.port !== '443')) throw new ApiError(422, 'URL_INVALID', 'Tautan tidak valid.');
  if (!hostAllowed(u.hostname.toLowerCase(), allowed)) {
    throw new ApiError(422, 'URL_NOT_ALLOWED', `Situs ini belum didukung. Situs yang didukung: ${allowed.join(', ')}.`);
  }
  u.hash = '';
  return u;
}

/* -------------------------------------------------------------- HTML ke teks */
const NAMED = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (t) => t
  .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch { return ''; } })
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch { return ''; } })
  .replace(/&(nbsp|amp|lt|gt|quot|apos);/g, (_, n) => NAMED[n]);

const classTokens = (attrs) => {
  const m = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
  return m ? (m[1] ?? m[2]).split(/\s+/) : [];
};

/** Elemen (dengan penghitungan tag bersarang) yang memiliki kelas tertentu. */
export function findByClass(html, token) {
  const found = [];
  const open = /<([a-z][a-z0-9]*)\b([^>]*)>/gi;
  let m;
  while ((m = open.exec(html))) {
    if (m[2].endsWith('/') || !classTokens(m[2]).includes(token)) continue;
    const tag = m[1].toLowerCase();
    const re = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'gi');
    re.lastIndex = open.lastIndex;
    let depth = 1; let t; let end = html.length;
    while ((t = re.exec(html))) {
      if (t[2]) continue; // self-closing
      depth += t[1] ? -1 : 1;
      if (depth === 0) { end = t.index; break; }
    }
    found.push({ start: m.index, end: Math.min(html.length, end + tag.length + 3), inner: html.slice(open.lastIndex, end) });
    open.lastIndex = Math.max(open.lastIndex, end);
  }
  return found;
}

const removeByClass = (html, token) => {
  let out = html;
  for (const f of findByClass(html, token).reverse()) out = out.slice(0, f.start) + out.slice(f.end);
  return out;
};

const blocksToText = (html) => decode(
  html
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|section|article|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ''),
).split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean);

/* ------------------------------------------------- Pembersih HTML (waktu linear)
 * Halaman sumber bisa memuat HTML jahat (mis. unggahan pengguna di archive.org). Regex lazy yang dijalankan
 * berulang pada tag tak tertutup membuat waktu proses kuadratik dan bisa menghabiskan batas waktu fungsi.
 * Tiga langkah di bawah dijamin linear terhadap ukuran halaman. */

/** Buang komentar HTML. Komentar yang tak ditutup berlaku sampai akhir dokumen (sama seperti browser). */
export function stripComments(html) {
  let out = ''; let i = 0;
  for (;;) {
    const s = html.indexOf('<!--', i);
    if (s < 0) return out + html.slice(i);
    out += html.slice(i, s);
    const e = html.indexOf('-->', s + 4);
    if (e < 0) return out;
    i = e + 3;
  }
}

/** Ubah "<" yang tidak punya ">" sebelum "<" berikutnya menjadi teks biasa, sehingga setiap tag selesai dalam satu pindai pendek. */
export const neutralizeStrayLt = (html) => html.replace(/<(?=[^<>]*(?:<|$))/g, '&lt;');

const DROP_TAGS = ['script', 'style', 'noscript', 'svg', 'template', 'iframe', 'select', 'button', 'nav', 'header', 'footer', 'aside', 'form'];

/** Buang elemen DROP_TAGS beserta isinya. Elemen tanpa penutup dibiarkan; pencarian penutup tidak diulang bila sudah pasti tak ada. */
export function stripElements(html) {
  const open = new RegExp(`<(${DROP_TAGS.join('|')})\\b`, 'gi');
  const close = Object.fromEntries(DROP_TAGS.map((t) => [t, new RegExp(`</${t}\\s*>`, 'gi')]));
  const noClose = new Set();
  let out = ''; let i = 0; let m;
  while ((m = open.exec(html))) {
    const tag = m[1].toLowerCase();
    out += html.slice(i, m.index);
    let end = -1; let endLen = 0;
    if (!noClose.has(tag)) {
      close[tag].lastIndex = open.lastIndex;
      const c = close[tag].exec(html);
      if (c) { end = c.index; endLen = c[0].length; } else noClose.add(tag);
    }
    if (end < 0) { out += m[0]; i = open.lastIndex; continue; }
    i = end + endLen;
    open.lastIndex = i;
  }
  return out + html.slice(i);
}

function extractTitle(html) {
  const s = html.search(/<title\b/i);
  if (s < 0) return '';
  const g = html.indexOf('>', s);
  if (g < 0) return '';
  const re = /<\/title\s*>/gi; re.lastIndex = g + 1;
  const c = re.exec(html);
  return c ? decode(html.slice(g + 1, c.index)).replace(/\s+/g, ' ').trim() : '';
}

export function htmlToArabicText(html, { plain = false } = {}) {
  if (plain) {
    const lines = html.split(/\r?\n/).map((l) => l.replace(/[ \t ]+/g, ' ').trim()).filter((l) => l && arabicRatio(l) >= 0.5);
    return { title: '', teks: lines.join('\n') };
  }
  const safe = neutralizeStrayLt(stripComments(html));
  const title = extractTitle(safe);

  let body = stripElements(safe);
  body = removeByClass(body, 'hamesh'); // catatan kaki penerbit/muhaqqiq

  const nass = findByClass(body, 'nass'); // isi kitab pada shamela.ws dan al-maktaba.org
  let lines;
  if (nass.length) {
    lines = blocksToText(nass.map((n) => n.inner).join('\n')).filter((l) => arabicRatio(l) >= 0.3);
  } else {
    lines = blocksToText(body).filter((l) => l.length >= 25 && arabicRatio(l) >= 0.7); // cadangan: buang menu dan teks pendek
  }
  return { title, teks: lines.join('\n') };
}

/** "ص3 - Nama Kitab - Bab - المكتبة الشاملة" -> {hal:'3', nama:'Nama Kitab'} */
export function parseTitle(title) {
  const m = /^ص\s*(\d+)\s+-\s+(.+?)\s+-\s+/.exec(title);
  return m ? { hal: m[1], nama: m[2].trim() } : { hal: '', nama: '' };
}

function cutAtBoundary(text, max) {
  if (text.length <= max) return { teks: text, terpotong: false };
  const slice = text.slice(0, max);
  const nl = slice.lastIndexOf('\n');
  return { teks: (nl > max * 0.5 ? slice.slice(0, nl) : slice).trim(), terpotong: true };
}

/* ------------------------------------------------------------------- Fetch */
async function readCapped(res, maxBytes) {
  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader();
    const chunks = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { try { await reader.cancel(); } catch {} throw new ApiError(422, 'SUMBER_TOO_LARGE', 'Halaman sumber terlalu besar untuk diproses.'); }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }
  const buf = Buffer.from(await res.text());
  if (buf.length > maxBytes) throw new ApiError(422, 'SUMBER_TOO_LARGE', 'Halaman sumber terlalu besar untuk diproses.');
  return buf;
}

/* Cache singkat per instance: guru sering membuka halaman yang sama berulang; mengurangi beban ke situs sumber dan risiko diblokir. */
const CACHE = new Map(); const CACHE_TTL = 5 * 60_000; const CACHE_MAX = 40;
export const __kosongkanCache = () => CACHE.clear();
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchKitab(rawUrl, { allowedHosts = DEFAULT_HOSTS, fetchImpl = fetch, maxBytes = 2_000_000, timeoutMs = 10_000, retryDelayMs = 400 } = {}) {
  let url = parseKitabUrl(rawUrl, allowedHosts);
  const kunciCache = url.href;
  const hit = CACHE.get(kunciCache);
  if (hit && Date.now() - hit.t < CACHE_TTL) return { ...hit.v, dariCache: true };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let res;
    for (let hop = 0; ; hop++) {
      const opsi = {
        redirect: 'manual', signal: ctl.signal,
        headers: { 'User-Agent': 'BankSoalMadrasah/1.0 (alat bantu guru; satu halaman per permintaan)', Accept: 'text/html,text/plain;q=0.9', 'Accept-Language': 'ar,id;q=0.8' },
      };
      try {
        res = await fetchImpl(url.href, opsi);
        if (res.status >= 500 && !ctl.signal.aborted) { await tidur(retryDelayMs); res = await fetchImpl(url.href, opsi); } // satu kali coba ulang untuk galat sementara
      } catch (e) {
        if (e && e.name === 'AbortError') throw e;
        await tidur(retryDelayMs); res = await fetchImpl(url.href, opsi);
      }
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        if (hop >= 3) throw new ApiError(502, 'SUMBER_ERROR', 'Situs sumber terlalu banyak mengalihkan.');
        url = parseKitabUrl(new URL(res.headers.get('location'), url).href, allowedHosts); // domain tujuan diperiksa ulang
        continue;
      }
      break;
    }
    if (res.status === 404) throw new ApiError(404, 'SUMBER_NOT_FOUND', 'Halaman tidak ditemukan di situs sumber. Periksa tautannya.');
    if (res.status === 429 || res.status === 403) throw new ApiError(502, 'SUMBER_BLOCKED', 'Situs sumber menolak permintaan otomatis dari server. Buka halamannya di tab baru, salin teksnya, lalu tempel di kolom Teks Kitab.');
    if (res.status !== 200) throw new ApiError(502, 'SUMBER_ERROR', `Situs sumber membalas dengan kode ${res.status}.`);

    const type = String(res.headers.get('content-type') || '').toLowerCase();
    const plain = type.startsWith('text/plain');
    if (!plain && !type.includes('html')) throw new ApiError(422, 'SUMBER_BUKAN_TEKS', 'Tautan ini bukan halaman teks (mungkin PDF atau gambar).');
    const charset = /charset=([\w-]+)/.exec(type)?.[1] || 'utf-8';
    const bytes = await readCapped(res, maxBytes);
    let html;
    try { html = new TextDecoder(charset).decode(bytes); } catch { html = new TextDecoder('utf-8').decode(bytes); }

    const { title, teks } = htmlToArabicText(html, { plain });
    if (teks.replace(/[^\p{L}]/gu, '').length < 15 || arabicRatio(teks) < 0.5) {
      throw new ApiError(422, 'TEKS_TIDAK_DITEMUKAN', 'Tidak ada teks Arab yang bisa diambil dari halaman ini. Salin teksnya manual lalu tempel di kolom teks.');
    }
    const cut = cutAtBoundary(teks, MAX_TEKS);
    const hasil = { url: url.href, host: url.hostname, judul: title.slice(0, 200), ...parseTitle(title), teks: cut.teks, terpotong: cut.terpotong };
    if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
    CACHE.set(kunciCache, { t: Date.now(), v: hasil });
    return hasil;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e && e.name === 'AbortError') throw new ApiError(504, 'SUMBER_TIMEOUT', 'Situs sumber terlalu lama merespons. Coba lagi.');
    throw new ApiError(502, 'SUMBER_ERROR', 'Tidak dapat menjangkau situs sumber. Coba lagi nanti.');
  } finally { clearTimeout(timer); }
}

/** Susun tautan halaman dari tautan kitab (mis. https://shamela.ws/book/823) dan nomor halaman. Null bila format tidak dikenali. */
export function bangunUrlHalaman(tautan, halaman) {
  const m = /^(https:\/\/[^?#]*\/book\/\d+)(?:\/\d+)?\/?$/.exec(normalisasiUrl(tautan));
  const n = Number(halaman);
  return m && Number.isInteger(n) && n >= 1 ? `${m[1]}/${n}` : null;
}
