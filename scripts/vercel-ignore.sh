#!/bin/sh
# Dipakai Vercel lewat "ignoreCommand" di vercel.json.
# Exit 0 = LEWATI build (tidak ada deployment baru); exit 1 = lanjut build.
#
# Tujuan: commit yang hanya mengubah dokumentasi, tes, eval, atau CI tidak perlu membuat deployment baru. Setiap deployment
# menambah "Function Storage" (batas 10 GB di Hobby) walaupun kodenya sama. Tes dan lint tetap berjalan di GitHub Actions.
#
# Aman-gagal: bila git tidak bisa membandingkan (mis. commit pertama, clone dangkal), build tetap jalan.

# Build paksa: isi FORCE_BUILD=1 di Vercel (Environment Variables) lalu Redeploy; hapus lagi sesudahnya.
# Perubahan environment variable TIDAK membuat commit baru, jadi tanpa ini Redeploy dibatalkan skrip ini dan nilai baru tidak pernah dipakai.
if [ "$FORCE_BUILD" = "1" ]; then
  echo "FORCE_BUILD=1: build dilanjutkan."
  exit 1
fi

# Pembanding: commit terakhir yang BERHASIL di-deploy (VERCEL_GIT_PREVIOUS_SHA, diisi Vercel bila ada Ignored Build Step). Satu push berisi beberapa commit
# (mis. commit kode lalu commit yang hanya mengubah docs/test) tidak boleh dilewati hanya karena commit TERAKHIR-nya tidak menyentuh kode.
# Bila tidak ada atau tidak ada di clone (clone dangkal): HEAD^, seperti sebelumnya.
DASAR=""
if [ -n "$VERCEL_GIT_PREVIOUS_SHA" ] && git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA^{commit}" 2>/dev/null; then
  DASAR="$VERCEL_GIT_PREVIOUS_SHA"
elif git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  DASAR="HEAD^"
else
  echo "Tidak ada commit pembanding: build dilanjutkan."
  exit 1
fi

# Hanya berkas yang memengaruhi hasil build/fungsi yang dihitung.
if git diff --quiet "$DASAR" HEAD -- \
  api src web public index.html \
  package.json package-lock.json \
  vercel.json vite.config.js postcss.config.js tailwind.config.js \
  scripts/vercel-ignore.sh; then
  echo "Tidak ada perubahan pada kode aplikasi (hanya docs/test/eval/CI): build dilewati."
  exit 0
fi

echo "Ada perubahan pada kode aplikasi: build dilanjutkan."
exit 1
