// Pemeriksa nada (sikap) soal: menandai kata yang menyalahkan, mengkafirkan, atau merendahkan pihak lain.
// Tanpa dependensi dan tanpa AI. Satu sumber: server (src/sikap.js) dan browser (window.Sikap).
// Hasilnya hanya penanda "periksa": kata seperti "kafir" sah muncul dalam bahasan fiqih, jadi manusia yang memutuskan.

export const POLA = [
  { re: /\b(sesat|menyesatkan|kesesatan)\b/i, alasan: 'menyebut pihak lain sesat' },
  { re: /\b(kafir|mengkafirkan|dikafirkan|pengkafiran|murtad|zindiq)\b/i, alasan: 'bahasa takfir' },
  { re: /\b(bodoh|dungu|biadab|rendahan|hina)\b/i, alasan: 'bahasa merendahkan' },
];

/**
 * @param {Record<string,string>} bidang  mis. hasil bidangDariAI / bidangDariSoal
 * @returns {{status:'aman'|'periksa', temuan:Array<{bidang:string,kata:string,alasan:string}>}}
 */
export function periksaSikap(bidang) {
  const temuan = [];
  for (const [nama, isi] of Object.entries(bidang || {})) {
    for (const p of POLA) {
      const m = String(isi || '').match(p.re);
      if (m) temuan.push({ bidang: nama, kata: m[0], alasan: p.alasan });
    }
  }
  return { status: temuan.length ? 'periksa' : 'aman', temuan };
}
