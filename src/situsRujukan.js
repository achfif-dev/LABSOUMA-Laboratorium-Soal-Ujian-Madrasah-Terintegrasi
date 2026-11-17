// Kategori aliran untuk sumber WEB yang dirujuk chat bebas (src/chatBebas.js).
// Prinsip sama dengan otoritas kitab (web/lib/otoritas.js): kategori ditetapkan ADMIN lewat daftar di bawah, BUKAN ditebak model.
// Domain yang tidak ada di daftar = "belum_dinilai" (ditampilkan apa adanya, tanpa menuduh). Kosakata status memakai STATUS_OTORITAS yang sama dengan kitab.
// Isi awal berpedoman pada haluan madrasah di src/aswaja.js (akidah Asy'ari/Maturidi, empat mazhab). Ini PENETAPAN AWAL untuk ditinjau admin, bukan penilaian benar-salah:
// ubah, tambah, atau hapus baris di sini lewat commit biasa. `domain` mencocokkan domain itu dan seluruh subdomainnya (islam.nu.or.id cocok dengan nu.or.id).
import { LABEL_STATUS, LABEL_AKIDAH } from '../web/lib/otoritas.js';

export const SITUS = [
  // Rumpun Aswaja (rujukan diakui)
  { domain: 'nu.or.id', aliran: 'Aswaja (NU)', status: 'rujukan', akidah: 'asyari' },
  { domain: 'tebuireng.online', aliran: 'Aswaja (NU)', status: 'rujukan', akidah: 'asyari' },
  { domain: 'bincangsyariah.com', aliran: 'Aswaja (NU)', status: 'rujukan', akidah: 'asyari' },
  { domain: 'dar-alifta.org', aliran: 'Aswaja (Dar al-Ifta Mesir)', status: 'rujukan', akidah: 'asyari' },
  { domain: 'aliftaa.jo', aliran: 'Aswaja (Dar al-Ifta Yordania)', status: 'rujukan', akidah: 'asyari' },
  { domain: 'azhar.eg', aliran: 'Aswaja (Al-Azhar)', status: 'rujukan', akidah: 'asyari' },
  // Pembanding: dibaca sebagai pendapat sumbernya, bukan ketentuan madrasah
  { domain: 'muhammadiyah.or.id', aliran: 'Muhammadiyah', status: 'pembanding', akidah: '' },
  { domain: 'tarjih.or.id', aliran: 'Muhammadiyah (Tarjih)', status: 'pembanding', akidah: '' },
  // Di luar rumpun Aswaja menurut haluan madrasah (akidah bukan Asy'ari/Maturidi, atau di luar Ahlussunnah)
  { domain: 'almanhaj.or.id', aliran: 'Salafi', status: 'luar_rumpun', akidah: 'lain' },
  { domain: 'rumaysho.com', aliran: 'Salafi', status: 'luar_rumpun', akidah: 'lain' },
  { domain: 'muslim.or.id', aliran: 'Salafi', status: 'luar_rumpun', akidah: 'lain' },
  { domain: 'yufid.com', aliran: 'Salafi', status: 'luar_rumpun', akidah: 'lain' },
  { domain: 'islamqa.info', aliran: 'Salafi', status: 'luar_rumpun', akidah: 'lain' },
  { domain: 'binbaz.org.sa', aliran: 'Salafi', status: 'luar_rumpun', akidah: 'lain' },
  { domain: 'al-islam.org', aliran: 'Syiah', status: 'luar_rumpun', akidah: 'lain' },
  { domain: 'sistani.org', aliran: 'Syiah', status: 'luar_rumpun', akidah: 'lain' },
  { domain: 'alislam.org', aliran: 'Ahmadiyah', status: 'luar_rumpun', akidah: 'lain' },
];

export const MAKS_SUMBER = 12;
const satuBaris = (v, n) => String(v ?? '').replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const adaDomain = (t) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(t);

/** Domain asli sumber. Gemini memberi tautan pengalihan (vertexaisearch...) dengan judul = domain; bila host-nya pengalih, pakai judul. */
export function domainDari(s) {
  let host = '';
  try { host = new URL(String(s && s.url)).hostname.toLowerCase().replace(/^www\./, ''); } catch { /* url tak sah */ }
  const judul = satuBaris(s && s.title, 200).toLowerCase().replace(/^www\./, '');
  if ((!host || /(^|\.)(vertexaisearch\.cloud\.google\.com|google\.com)$/.test(host)) && adaDomain(judul)) return judul;
  return host;
}

export function kategorikan(domain) {
  const d = String(domain || '').toLowerCase();
  const e = SITUS.find((x) => d === x.domain || d.endsWith(`.${x.domain}`));
  const status = e ? e.status : 'belum_dinilai';
  return { status, labelStatus: LABEL_STATUS[status], aliran: e ? e.aliran : '', akidah: e && e.akidah ? LABEL_AKIDAH[e.akidah] : '', ditetapkan: !!e };
}

/** Sumber mentah dari penyedia ({url,title}) -> daftar rapi: hanya http(s), unik per url, tiap sumber diberi kategori dari daftar admin. */
export function olahSumber(mentah) {
  const lihat = new Set(); const hasil = [];
  for (const s of Array.isArray(mentah) ? mentah : []) {
    const url = String(s && s.url || '').trim();
    if (!/^https?:\/\//i.test(url) || url.length > 800 || lihat.has(url)) continue;
    lihat.add(url);
    const domain = domainDari(s);
    hasil.push({ url, judul: satuBaris(s.title, 160) || domain || url, domain, ...kategorikan(domain) });
    if (hasil.length >= MAKS_SUMBER) break;
  }
  return hasil;
}

/** Ringkasan untuk banner: ada sumber di luar rumpun (pembanding/luar_rumpun) dan/atau yang belum dinilai admin. */
export const ringkasSumber = (sumber) => ({
  adaLuarAswaja: sumber.some((s) => s.status === 'pembanding' || s.status === 'luar_rumpun'),
  adaBelumDinilai: sumber.some((s) => s.status === 'belum_dinilai'),
});
