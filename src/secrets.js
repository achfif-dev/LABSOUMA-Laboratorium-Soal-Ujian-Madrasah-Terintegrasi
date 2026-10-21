// Enkripsi kunci API yang disimpan di Firestore (AES-256-GCM, bawaan Node, tanpa dependensi).
// Kunci utama: CONFIG_ENCRYPTION_KEY (32 byte base64) bila diisi; jika tidak, diturunkan dari
// FIREBASE_SERVICE_ACCOUNT yang sudah rahasia dan hanya ada di server. Konsekuensinya: bila kunci akun
// layanan diganti, kunci AI tersimpan tidak bisa dibuka lagi dan admin cukup memasukkannya ulang.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { ApiError } from './soalService.js';

export function masterKey(env = process.env) {
  const explicit = String(env.CONFIG_ENCRYPTION_KEY || '').trim();
  if (explicit) {
    const b = Buffer.from(explicit, 'base64');
    if (b.length !== 32) throw new ApiError(500, 'SERVER_NOT_CONFIGURED', 'CONFIG_ENCRYPTION_KEY harus 32 byte dalam base64 (44 karakter).');
    return b;
  }
  const basis = String(env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!basis) throw new ApiError(500, 'SERVER_NOT_CONFIGURED', 'Tidak ada kunci enkripsi: isi FIREBASE_SERVICE_ACCOUNT atau CONFIG_ENCRYPTION_KEY.');
  return Buffer.from(hkdfSync('sha256', basis, 'bank-soal-madrasah/salt', 'ai-config-v1', 32));
}

/** @param aad  data pengikat (mis. nama penyedia) supaya ciphertext tidak bisa dipindah ke slot lain */
export function encryptSecret(plain, key, aad = '') {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
}

export function decryptSecret(blob, key, aad = '') {
  const [v, iv, tag, ct] = String(blob || '').split('.');
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('format');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
}
