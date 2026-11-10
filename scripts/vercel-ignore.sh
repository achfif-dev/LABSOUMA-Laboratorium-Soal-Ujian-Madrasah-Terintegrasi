#!/bin/sh
# Dipakai Vercel lewat "ignoreCommand" di vercel.json.
# Exit 0 = LEWATI build (tidak ada deployment baru); exit 1 = lanjut build.
#
# Tujuan: commit yang hanya mengubah dokumentasi, tes, eval, atau CI tidak perlu membuat deployment baru. Setiap deployment
# menambah "Function Storage" (batas 10 GB di Hobby) walaupun kodenya sama. Tes dan lint tetap berjalan di GitHub Actions.
#
# Aman-gagal: bila git tidak bisa membandingkan (mis. commit pertama, clone dangkal), build tetap jalan.

if ! git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  echo "Tidak ada commit pembanding: build dilanjutkan."
  exit 1
fi

# Hanya berkas yang memengaruhi hasil build/fungsi yang dihitung.
if git diff --quiet HEAD^ HEAD -- \
  api src web public index.html \
  package.json package-lock.json \
  vercel.json vite.config.js postcss.config.js tailwind.config.js \
  scripts/vercel-ignore.sh; then
  echo "Tidak ada perubahan pada kode aplikasi (hanya docs/test/eval/CI): build dilewati."
  exit 0
fi

echo "Ada perubahan pada kode aplikasi: build dilanjutkan."
exit 1
