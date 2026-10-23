// Firestore tiruan di memori untuk tes: dokumen, koleksi (orderBy/limit/select), batch, dan transaksi.
// Transaksi menumpuk penulisan dan baru menerapkannya bila fungsinya selesai tanpa galat (seperti Firestore asli: gagal = tidak ada yang tertulis).
const salin = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

export function fakeDb(data = {}) {
  const snapOf = (path) => ({ id: path.split('/').pop(), exists: path in data, data: () => salin(data[path]), ref: ref(path) });
  function ref(path) {
    return {
      path, id: path.split('/').pop(),
      get: async () => snapOf(path),
      set: async (v) => { data[path] = salin(v); },
      delete: async () => { delete data[path]; },
    };
  }
  const query = (name, st = {}) => ({
    doc: (id) => ref(`${name}/${id}`),
    orderBy: (f, dir = 'asc') => query(name, { ...st, f, dir }),
    limit: (n) => query(name, { ...st, n }),
    select: (...fields) => query(name, { ...st, fields }),
    get: async () => {
      let docs = Object.keys(data).filter((p) => p.startsWith(name + '/') && !p.slice(name.length + 1).includes('/')).map((p) => ({ p, v: data[p] }));
      if (st.f) docs.sort((a, b) => (a.v[st.f] < b.v[st.f] ? -1 : a.v[st.f] > b.v[st.f] ? 1 : 0) * (st.dir === 'desc' ? -1 : 1));
      if (st.n) docs = docs.slice(0, st.n);
      return { docs: docs.map(({ p, v }) => ({ id: p.split('/').pop(), ref: ref(p), exists: true, data: () => salin(st.fields ? Object.fromEntries(st.fields.filter((f) => f in v).map((f) => [f, v[f]])) : v) })) };
    },
  });
  const terapkan = (ops) => { for (const o of ops) { if (o.t === 'set') data[o.path] = salin(o.v); else delete data[o.path]; } };
  return {
    data,
    doc: ref,
    collection: (name) => query(name),
    batch: () => { const ops = []; return { set: (r, v) => ops.push({ t: 'set', path: r.path, v }), delete: (r) => ops.push({ t: 'del', path: r.path }), commit: async () => terapkan(ops) }; },
    runTransaction: async (fn) => {
      const ops = [];
      const tx = { get: async (r) => r.get(), set: (r, v) => { ops.push({ t: 'set', path: r.path, v }); return tx; }, delete: (r) => { ops.push({ t: 'del', path: r.path }); return tx; }, update() {} };
      const hasil = await fn(tx);
      terapkan(ops); // hanya bila fn selesai tanpa galat
      return hasil;
    },
  };
}
