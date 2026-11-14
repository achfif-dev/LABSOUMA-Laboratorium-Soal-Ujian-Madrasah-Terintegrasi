import React, { useEffect, useMemo, useState } from 'react';
import { Draft, Label, Select, Uj, useAlur, useCfg } from './ui.jsx';
import { Bt, KEYS, STATUS, ejaanTersimpan, levelLabel, namaArabKitab, optsOf } from './lib/dasar.js';
import * as AL from './lib/alurSoal.js';
import { Check } from 'lucide-react';
import { hashBaca, rujukanSah } from './lib/rujukan.js';

// Kamus Pegon bersama (Firestore kamusPegon). docs: dokumen mentah untuk daftar; ver: naik tiap kali kamus berubah agar Pegon dirender ulang.
export const KamusCtx = React.createContext({ docs: [], ver: 0, err: null, canShare: false, simpan: async () => {}, hapus: async () => {} });

export const useKamus = () => React.useContext(KamusCtx);

export const tingkatAktif = (cfg) => cfg.tingkat.filter((t) => t.aktif);

export const labelTingkat = (cfg, nama) => ((cfg.tingkat.find((t) => t.nama === nama) || {}).label) || nama;

// Kitab di dropdown = kitab aktif di Konfigurasi untuk tingkat dan mapel terpilih. Kitab "(tanpa mapel)" berlaku untuk semua mapel.
// Tanpa cadangan: kalau tidak ada yang cocok, daftar kosong (pengguna bisa memilih "Lainnya").
// Kelas dan periode ujian (opsional) mempersempit lagi lewat penempatan kitab per kelas (public/ujian.js).
export const kitabUntuk = (cfg, tingkat, mapel, kelas = '', periode = '') =>
  cfg.kitab.filter((k) => k.aktif && (!tingkat || k.tingkat.includes(tingkat)) && (!mapel || !k.mapel || k.mapel === mapel) && Uj.kitabCocok(k, { tingkat, kelas, periode }));

export const KITAB_LAIN = '__lain__';

export const labelArabTingkat = (cfg, nama) => ((cfg.tingkat.find((t) => t.nama === nama) || {}).labelArab) || '';

// Teks Arab di tengah kalimat Latin: font Amiri, arah RTL terisolasi.
export const ArNama = ({ children, className = '' }) => (children ? <span dir="rtl" lang="ar" className={'ar-nama ' + className}>{children}</span> : null);

// Tambahan setelah rujukan kitab: " · نama Arab" bila kitab ada di katalog dan punya nama Arab.
export const RefArab = ({ q }) => { const a = namaArabKitab(useCfg(), q.nama); return a ? <> · <ArNama>{a}</ArNama></> : null; };

export const ROLE_LABEL = { pending: 'Menunggu persetujuan', penyusun: 'Penyusun', editor: 'Editor', admin: 'Admin', ustadz: 'Ustadz', nonaktif: 'Nonaktif' };

export const FIELDS = ['tingkat', 'mapel', 'level', 'kelas', 'periode', 'nama', 'juz', 'hal', 'bab', 'teks', 'stimulus', 'pertanyaan', 'indikator', 'sumberUrl', 'opsi', 'kunci', 'pembahasan', 'bentuk', 'jawaban', 'rubrik', 'kitabId', 'halId', 'halIdAkhir', 'dasar'];

export const emptyForm = () => ({
  tingkat: 'Aliyah', mapel: 'Fiqih', level: 'L3',
  kelas: '', periode: '', // opsional: kelas dan kode periode ujian (label periode diatur di Konfigurasi)
  nama: '', juz: '', hal: '', bab: '', // bab: opsional, dasar pengelompokan kisi-kisi
  kitabId: '', halId: '', halIdAkhir: '', // tautan balik ke halaman kitab di perpustakaan (web/lib/rujukan.js); kosong = soal tidak berasal dari perpustakaan
  teks: '',
  stimulus: '', pertanyaan: '', indikator: '', sumberUrl: '',
  bentuk: 'pilgan', // pilgan | lanjutan | benarsalah | isian | uraian (public/bentuk.js)
  opsi: { A: '', B: '', C: '', D: '', E: '' }, kunci: '', pembahasan: '', jawaban: '', rubrik: '', // jawaban/rubrik: isian dan uraian
  dasar: '', // opsional: fakta yang diuji + alasan pengecoh (mode fakta); untuk penyusun dan editor, tidak masuk naskah ujian
  ai: { dibuat: false, model: '', verifikasi: '', buta: '' }, // jejak audit: dibuat AI? model apa? lolos pemeriksaan apa?
});

export function useEjaan() {
  const [e, setE] = useState(ejaanTersimpan);
  const ubah = (v) => { const s = window.Pegon ? window.Pegon.ejaanSah(v) : 'alqolam'; setE(s); Draft.save('pegonEjaan', { ejaan: s }); };
  return [e, ubah];
}

export function EjaanPilih({ id, value, onChange }) {
  const P = window.Pegon;
  return (
    <div><Label htmlFor={id} hint="(huruf p, c, g, ng, ny)">Ejaan huruf Pegon</Label>
      <Select id={id} value={value} onChange={onChange}>
        {Object.entries(P ? P.EJAAN : { alqolam: 'Al-Qolam' }).map(([k, x]) => <option key={k} value={k}>{x}</option>)}
      </Select></div>
  );
}

// Bentuk form dari draf yang dibaca: total (tidak pernah melempar) dan hanya menerima string pada tempatnya, supaya draf rusak tidak membuat halaman gagal tampil.
export const normalForm = (src) => {
  const base = emptyForm(); const x = src && typeof src === 'object' ? src : {};
  const str = (v, d) => (typeof v === 'string' ? v : d);
  const o = { ...base };
  for (const k of FIELDS) if (k !== 'opsi' && k !== 'ai' && typeof x[k] === 'string') o[k] = x[k];
  const so = x.opsi && typeof x.opsi === 'object' ? x.opsi : {};
  o.opsi = Object.fromEntries(KEYS.map((k) => [k, str(so[k], '')]));
  if (!KEYS.includes(o.kunci)) o.kunci = '';
  o.bentuk = Bt.bentukDari(o.bentuk);
  const sa = x.ai && typeof x.ai === 'object' ? x.ai : {};
  o.ai = { dibuat: sa.dibuat === true, model: str(sa.model, '').slice(0, 60), verifikasi: str(sa.verifikasi, ''), buta: str(sa.buta, '') };
  return o;
};

// Ada teks yang diketik pengguna? (dasar peringatan dan pemberitahuan pemulihan)
export const formBerisi = (f) => ['nama', 'juz', 'hal', 'teks', 'stimulus', 'pertanyaan', 'indikator', 'sumberUrl', 'kunci', 'pembahasan', 'jawaban', 'rubrik'].some((k) => String(f[k] || '').trim()) || KEYS.some((k) => String((f.opsi || {})[k] || '').trim());

// Ada yang berbeda dari form kosong (termasuk pilihan tingkat/mapel/level)? Bila tidak, tidak ada yang perlu disimpan.
export const formBeda = (f) => { const e = emptyForm(); return FIELDS.some((k) => JSON.stringify(f[k]) !== JSON.stringify(e[k])); };

// Penanda "draf otomatis tersimpan". `names` membatasi ke kunci draf tertentu; tanpa itu, semua.
export function DraftNote({ names, className = '' }) {
  const [st, setSt] = useState(null);
  useEffect(() => Draft.onStatus((x) => { if (!names || names.includes(x.name)) setSt(x); }), []);
  const warn = (t) => <p role="status" className={'text-xs font-medium text-warn ' + className}>{t}</p>;
  if (!Draft.tersedia) return warn('Browser ini memblokir penyimpanan lokal, jadi isian tidak bisa dipulihkan setelah muat ulang. Simpan sebagai draft sebelum menutup halaman.');
  if (!st) return null;
  if (!st.ok) return warn(st.reason === 'terlalu-besar' ? 'Isian terlalu besar untuk draf otomatis. Simpan sebagai draft sebelum menutup halaman.' : 'Draf otomatis gagal disimpan (penyimpanan browser penuh atau ditolak). Simpan sebagai draft sebelum menutup halaman.');
  return <p role="status" className={'text-xs text-mute ' + className}>Draf otomatis tersimpan di perangkat ini · {new Date(st.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>;
}

/* ---------- Small UI parts ---------- */
export const Badge = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-black/5 ${STATUS[status].cls}`}>{STATUS[status].label}</span>
);

export const TahapChip = ({ q }) => {
  const t = AL.labelTahap(q, useAlur());
  return t ? <span className="inline-flex items-center rounded-full bg-soft px-2.5 py-0.5 text-xs font-semibold text-soft-ink ring-1 ring-inset ring-black/5">{t}</span> : null;
};

export const Chip = ({ children }) => (
  <span className="inline-flex items-center rounded-md border border-line px-2 py-0.5 text-xs font-medium text-mute">{children}</span>
);

export const Empty = ({ icon: Icon, title, text }) => (
  <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-soft text-soft-ink"><Icon size={22} /></div>
    <p className="font-semibold">{title}</p>
    <p className="mx-auto mt-1 max-w-sm text-sm text-mute">{text}</p>
  </div>
);

/* ---------- Pemeriksa kutipan Arab (gratis, di browser, tanpa kuota AI) ---------- */
const KUTIPAN_UI = {
  lolos: ['Kutipan cocok dengan teks kitab', 'bg-ok-bg text-ok'],
  periksa: ['Periksa kutipan secara manual', 'bg-warn-bg text-warn'],
  gagal: ['Ada kutipan yang tidak ada di teks kitab', 'bg-bad-bg text-bad'],
};

function SikapBadge({ q }) {
  const S = window.Sikap; const K = window.Kutipan;
  const r = useMemo(() => (S && K ? S.periksaSikap(K.bidangDariSoal(q)) : null), [S, K, q.stimulus, q.pertanyaan, q.opsi, q.pembahasan]);
  if (!r || r.status === 'aman') return null;
  return (
    <div className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">
      <p className="font-semibold">Periksa nada soal (madrasah berhaluan wasathiyah)</p>
      {r.temuan.map((t, i) => <p key={i} className="mt-1">Kata “{t.kata}” di {t.bidang}: {t.alasan}. Pastikan sesuai teks dan tidak menyalahkan pihak lain.</p>)}
    </div>
  );
}

export function KutipanBadge({ q }) {
  const K = window.Kutipan;
  const r = useMemo(
    () => (K && q.teks && q.pembahasan ? K.periksaKutipan(K.bidangDariSoal(q), q.teks) : null),
    [K, q.teks, q.pembahasan, q.stimulus, q.pertanyaan, q.opsi],
  );
  if (!r || r.status === 'tanpa_teks') return null;
  const [label, cls] = KUTIPAN_UI[r.status];
  const bermasalah = r.detail.filter((d) => d.status !== 'cocok');
  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${cls}`}>
      <p className="font-semibold">{label}{r.ringkas.total ? ` (${r.ringkas.cocok} dari ${r.ringkas.total} cocok)` : ''}</p>
      {r.peringatan.map((w, i) => <p key={'w' + i} className="mt-1">{w}</p>)}
      {bermasalah.map((d, i) => (
        <div key={i} className="mt-2 border-t border-line pt-2">
          <p className="font-semibold">{d.label}: {d.bedaHarakat ? 'kata sama, tetapi harakat berbeda dari teks kitab' : d.status === 'mirip' ? 'mirip, tapi ada kata yang berbeda' : 'tidak ditemukan di teks kitab'}</p>
          <p dir="rtl" lang="ar" className="ar mt-1">{d.kutipan}</p>
          {d.bedaHarakat && d.bedaHarakat.map((h, j) => <p key={j} className="mt-1" dir="rtl" lang="ar"><span className="ar">{h.kutipan}</span> ≠ <span className="ar">{h.teks}</span></p>)}
          {d.terdekat && <p className="mt-1">Bagian teks yang paling dekat (tanpa harakat):</p>}
          {d.terdekat && <p dir="rtl" lang="ar" className="ar">{d.terdekat}</p>}
        </div>
      ))}
    </div>
  );
}

export const QuestionView = ({ q }) => (
  <div className="space-y-3">
    {Bt.bentukDari(q) !== 'pilgan' && <p className="text-xs font-semibold uppercase tracking-wide text-mute">{Bt.BENTUK[Bt.bentukDari(q)].label}</p>}
    {q.stimulus && <p className="rounded-lg bg-soft px-3 py-2 text-sm leading-relaxed text-soft-ink">{q.stimulus}</p>}
    <p className="font-semibold leading-relaxed">{q.pertanyaan}</p>
    {optsOf(q).length > 0 && (
      <ul className="space-y-1.5">
        {optsOf(q).map((k) => (
          <li key={k} className={`flex gap-2 rounded-lg border px-3 py-2 text-sm ${k === q.kunci ? 'border-brand bg-ok-bg text-ok' : 'border-line'}`}>
            <span className="font-bold">{k}.</span>
            <span className="min-w-0 flex-1 break-words">{q.opsi[k]}</span>
            {k === q.kunci && <Check size={16} className="mt-0.5 shrink-0" />}
          </li>
        ))}
      </ul>
    )}
    {Bt.BENTUK[Bt.bentukDari(q)].jawaban && q.jawaban && (
      <p className="whitespace-pre-wrap rounded-lg border border-brand bg-ok-bg px-3 py-2 text-sm text-ok"><span className="font-bold">{Bt.bentukDari(q) === 'uraian' ? 'Jawaban model: ' : 'Jawaban: '}</span>{q.jawaban}</p>
    )}
    {Bt.bentukDari(q) === 'uraian' && q.rubrik && (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-mute"><span className="font-semibold text-ink">Pedoman penskoran: </span>{q.rubrik}</p>
    )}
    {q.pembahasan && (
      <p className="text-sm leading-relaxed text-mute"><span className="font-semibold text-ink">Pembahasan: </span>{q.pembahasan}</p>
    )}
    {q.dasar && (
      <p className="whitespace-pre-wrap rounded-lg bg-soft px-3 py-2 text-xs leading-relaxed text-soft-ink"><span className="font-semibold">Dasar soal: </span>{q.dasar}</p>
    )}
    <KutipanBadge q={q} />
    <SikapBadge q={q} />
    {q.indikator && (
      <p className="text-sm leading-relaxed text-mute"><span className="font-semibold text-ink">Indikator: </span>{q.indikator}</p>
    )}
  </div>
);

export const Meta = ({ q }) => {
  const cfg = useCfg();
  return (
  <div className="flex flex-wrap gap-1.5">
    <Chip>{q.mapel}</Chip><Chip>{labelTingkat(cfg, q.tingkat)}</Chip>{q.kelas && <Chip>Kelas {q.kelas}</Chip>}{q.periode && <Chip>{Uj.labelPeriode(cfg, q.tingkat, q.periode)}</Chip>}{q.bab && <Chip>Bab: {q.bab}</Chip>}<Chip>{levelLabel(q.level)}</Chip>{Bt.bentukDari(q) !== 'pilgan' && <Chip>{Bt.BENTUK[Bt.bentukDari(q)].label}</Chip>}
    {q.contoh && <Chip>Contoh data</Chip>}
    {q.ai && q.ai.dibuat && <Chip>Dibuat AI{q.ai.model ? ` · ${q.ai.model}` : ''}</Chip>}
  </div>
  );
};

export function TautKitab({ q }) {
  if (!rujukanSah(q)) return null;
  return <> · <a href={hashBaca(q)} className="font-semibold text-brand underline" title="Buka halaman kitab asal soal ini di tab Baca Kitab">Buka di kitab</a></>;
}

export const refText = (q) => [q.nama || 'Kitab belum diisi', q.juz && `Juz ${q.juz}`, q.hal && `Hal. ${q.hal}`].filter(Boolean).join(' · ');

export const Toast = ({ t }) => t ? (
  <div role="status" className="fade-in fixed left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-head px-4 py-3 text-sm font-medium text-head-ink shadow-xl"
       style={{ bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', maxWidth: 'calc(100vw - 32px)' }}>
    {t}
  </div>
) : null;

export const SourceLink = ({ url }) => (/^https:\/\//.test(url || '')
  ? <a href={url} target="_blank" rel="noopener noreferrer" className="break-all underline">{url}</a> : null);

/* Membersihkan teks salinan Maktabah Syamilah: penanda halaman [ص: ١٢], nomor catatan kaki, tatwil, karakter tak terlihat. */
export const cleanArabic = (t) => String(t || '')
  .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
  .replace(/ـ/g, '')
  .replace(/\[\s*(?:ص|ج)?\s*[:：]?\s*[\d٠-٩]+(?:\s*[\/:]\s*[\d٠-٩]+)?\s*\]/g, '')
  .replace(/\(\s*[\d٠-٩]{1,2}\s*\)/g, '')
  .replace(/[ \t ]+/g, ' ')
  .split('\n').map((l) => l.trim()).join('\n')
  .replace(/\n{3,}/g, '\n\n').trim();

const PAGE_RE = /^(https:\/\/[^?#]*\/book\/\d+\/)(\d+)(.*)$/;

const BOOK_RE = /^(https:\/\/[^?#]*\/book\/\d+)(?:\/\d+)?\/?$/;

export const urlHalaman = (tautan, hal) => { const m = BOOK_RE.exec(String(tautan || '').trim()); const n = Number(hal); return m && Number.isInteger(n) && n >= 1 ? m[1] + '/' + n : null; };

export const cariGoogle = (nama) => 'https://www.google.com/search?q=' + encodeURIComponent('site:shamela.ws ' + nama);

export const pageNav = (url, d) => { const m = PAGE_RE.exec(url || ''); if (!m) return null; const n = Number(m[2]) + d; return n >= 1 ? m[1] + n : null; };

export const VERDICT = { layak: ['Layak', 'bg-ok-bg text-ok'], perlu_perbaikan: ['Perlu perbaikan', 'bg-warn-bg text-warn'], tidak_layak: ['Tidak layak', 'bg-bad-bg text-bad'] };

export const ASPEK = { kunci: 'Kunci', pengecoh: 'Pengecoh', kejelasan: 'Kejelasan', level: 'Level', bahasa: 'Bahasa', pembahasan: 'Pembahasan', rujukan: 'Rujukan', indikator: 'Indikator', kesesuaian_teks: 'Kesesuaian teks', jawaban: 'Jawaban', rubrik: 'Pedoman penskoran', bentuk: 'Bentuk soal' };

export const H3 = ({ children }) => <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-mute">{children}</h3>;

/* ---------- Tab: Fokus Ujian (saran AI bab penting + kisi-kisi dari soal) ---------- */
// Saran AI (haluan Ahlussunnah wal Jamaah, setia pada teks kitab) hanya MENYARANKAN bab. Kisi-kisi dihitung dari soal yang sudah ada
// (public/kisi.js), jadi tidak mengarang. Kunci jawaban, opsi, dan pembahasan tidak pernah ikut keluar, sehingga aman dibagikan ke murid.
// Nama top-level di blok ini tidak boleh sama dengan properti window (lihat catatan Draft di atas): modul kisi diakses lewat window.Kisi.
export const SaranCtx = React.createContext({ saran: null, setSaran: () => {}, pakaiBab: () => {} });

export const PRIO_BAB = { inti: ['Inti', 'bg-ok-bg text-ok'], penting: ['Penting', 'bg-soft text-soft-ink'], pendukung: ['Pendukung', 'bg-bg text-mute'] };

export const JENIS_BAB = { akidah: 'Akidah', ibadah_pokok: 'Ibadah pokok', muamalah: 'Muamalah', akhlak: 'Akhlak', nahwu_sharaf: 'Nahwu/Sharaf', hadits_quran: "Hadits/Qur'an", sejarah: 'Sejarah', lainnya: 'Lainnya' };

export const CAKUPAN_STATUS = { kosong: ['Belum ada soal', 'bg-bad-bg text-bad'], kurang: ['Kurang', 'bg-warn-bg text-warn'], cukup: ['Cukup', 'bg-ok-bg text-ok'], lebih: ['Lebih', 'bg-soft text-soft-ink'], ada: ['Ada soal', 'bg-ok-bg text-ok'] };
