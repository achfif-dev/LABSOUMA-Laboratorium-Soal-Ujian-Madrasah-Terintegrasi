import React from 'react';
import { LayarMuat } from './Merek.jsx';
import { denganPegon } from './ui.jsx';

// Tab dan panel besar dimuat saat pertama dibuka, bukan saat aplikasi dibuka (memangkas unduhan awal, penting di HP).
// Kegagalan memuat potongan (mis. offline dan belum pernah dibuka) hanya menampilkan pesan di panel itu, bukan merobohkan seluruh aplikasi.
class GagalMuatPanel extends React.Component {
  constructor(p) { super(p); this.state = { gagal: false }; }
  static getDerivedStateFromError() { return { gagal: true }; }
  render() {
    if (!this.state.gagal) return this.props.children;
    return (
      <div role="alert" className="rounded-xl border border-line bg-white p-4 text-sm text-mute">
        Bagian ini gagal dimuat (mungkin sinyal terputus).{' '}
        <button type="button" className="font-semibold text-ink underline" onClick={() => this.setState({ gagal: false })}>Coba lagi</button>
      </div>
    );
  }
}

export const lazyPanel = (muat) => {
  const C = React.lazy(() => muat().catch((e) => { throw e; }));
  return function PanelMalas(props) {
    return (
      <GagalMuatPanel>
        <React.Suspense fallback={<LayarMuat ringkas />}><C {...props} /></React.Suspense>
      </GagalMuatPanel>
    );
  };
};

export const PemilihKitab = lazyPanel(() => import('./PemilihKitab.jsx'));

export const Export = denganPegon(lazyPanel(() => import('./ExportTab.jsx')));

export const PeriksaRujukan = lazyPanel(() => import('./PeriksaRujukan.jsx'));

export const FaktaTeks = lazyPanel(() => import('./FaktaTeks.jsx'));
