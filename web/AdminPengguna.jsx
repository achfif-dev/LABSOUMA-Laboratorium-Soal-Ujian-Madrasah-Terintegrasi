import * as AL from './lib/alurSoal.js';
import { useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { Loader2 } from 'lucide-react';
import { ROLE_LABEL } from './bersama.jsx';

function TahapEditorPilih({ r, onSet, disabled }) {
  const sel = AL.tahapDitugaskan(r);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="text-mute">Tahap editor:</span>
      {Array.from({ length: AL.MAKS_TAHAP }, (_, i) => i + 1).map((n) => (
        <label key={n} className="inline-flex items-center gap-1">
          <input type="checkbox" className="h-4 w-4" disabled={disabled} checked={sel.includes(n)} onChange={(e) => onSet(r.id, e.target.checked ? [...sel, n].sort() : sel.filter((x) => x !== n))} aria-label={`Editor tahap ${n}: ${r.name || r.email}`} />{n}
        </label>
      ))}
    </div>
  );
}

/* ---------- Pengguna (admin) ---------- */
export function UserAdmin({ me, toast }) {
  const [rows, setRows] = useState(null);
  useEffect(() => firebase.firestore().collection('users').orderBy('createdAt', 'desc').onSnapshot(
    (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))),
    () => setRows([]),
  ), []);
  const setRole = async (id, role) => {
    try { await firebase.firestore().doc('users/' + id).update({ role }); toast('Peran diperbarui.'); }
    catch (e) { toast('Gagal mengubah peran.'); }
  };
  const setTahap = async (id, tahapEditor) => {
    try { await firebase.firestore().doc('users/' + id).update({ tahapEditor }); toast('Tahap editor diperbarui.'); }
    catch (e) { toast('Gagal mengubah tahap editor. Pastikan firestore.rules terbaru sudah diterbitkan.'); }
  };
  if (!rows) return <div className="flex justify-center py-16 text-mute"><Loader2 className="spin" /></div>;
  const waiting = rows.filter((r) => r.role === 'pending').length;
  return (
    <div className="fade-in space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-mute">
        Pengguna baru masuk dengan status <b className="text-ink">Menunggu persetujuan</b>. Beri peran agar mereka bisa bekerja.
        Penyusun membuat soal, editor meninjau, admin mengelola semuanya. Ustadz memakai alat bantu (AI, Pegon, ekspor) untuk soal latihan sendiri, tanpa akses ke bank soal.{waiting > 0 && <b className="ml-1 text-warn">{waiting} menunggu.</b>}
      </div>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface sm:hidden">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2 p-4">
            <div className="min-w-0"><p className="break-words font-semibold">{r.name || r.email}</p><p className="break-all text-xs text-mute">{r.email}</p></div>
            <select aria-label={'Peran ' + (r.name || r.email)} className="field" value={r.role} disabled={r.id === me.uid} onChange={(e) => setRole(r.id, e.target.value)}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {r.role === 'editor' && <TahapEditorPilih r={r} disabled={r.id === me.uid} onSet={setTahap} />}
            <p className="text-xs text-mute">{r.id === me.uid ? '(Anda) · ' : ''}Terakhir masuk: {(() => { try { const d = r.lastLoginAt && r.lastLoginAt.toDate ? r.lastLoginAt.toDate() : null; return d ? d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'; } catch (e) { return '-'; } })()}</p>
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface max-sm:hidden">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-mute">
            <tr><th className="px-4 py-3">Pengguna</th><th className="px-4 py-3">Peran</th><th className="px-4 py-3">Terakhir masuk</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3"><p className="font-semibold">{r.name || r.email}</p><p className="text-xs text-mute">{r.email}</p></td>
                <td className="px-4 py-3">
                  <select aria-label={'Peran ' + (r.name || r.email)} className="field !w-auto" value={r.role} disabled={r.id === me.uid} onChange={(e) => setRole(r.id, e.target.value)}>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {r.id === me.uid && <span className="ml-2 text-xs text-mute">(Anda)</span>}
                  {r.role === 'editor' && <TahapEditorPilih r={r} disabled={r.id === me.uid} onSet={setTahap} />}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-mute">{(() => { try { const d = r.lastLoginAt && r.lastLoginAt.toDate ? r.lastLoginAt.toDate() : null; return d ? d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'; } catch (e) { return '-'; } })()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
