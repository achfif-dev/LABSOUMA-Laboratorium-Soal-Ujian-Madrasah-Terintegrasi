import test from 'node:test';
import assert from 'node:assert/strict';
import { firebaseError, sendError } from '../src/platform.js';

test('firebaseError memetakan penyebab umum', () => {
  assert.equal(firebaseError({ code: 5, message: '5 NOT_FOUND: ' }).code, 'FIRESTORE_NOT_FOUND');
  assert.equal(firebaseError({ code: 7, message: 'PERMISSION_DENIED: Cloud Firestore API has not been used' }).code, 'FIRESTORE_PERMISSION');
  assert.equal(firebaseError({ message: 'Failed to parse private key' }).code, 'SERVER_CREDENTIAL');
  assert.equal(firebaseError({ message: "Cannot find package 'firebase-admin'" }).code, 'SERVER_DEPENDENCY');
  assert.equal(firebaseError(new Error('lain')), null);
});

test('sendError memakai pesan Firebase, bukan pesan soal', () => {
  let out;
  const res = { setHeader() {}, status(c) { out = { c }; return this; }, json(b) { out.b = b; return this; } };
  sendError(res, { code: 5, message: '5 NOT_FOUND' });
  assert.equal(out.c, 500);
  assert.match(out.b.error.message, /Firestore/);
});
