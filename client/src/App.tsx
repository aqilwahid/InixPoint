import React, { useState, useEffect } from 'react';
import { socket } from './lib/socket';
import { Room } from '@inixpoint/shared';
import { Presenter } from './components/Presenter';
import { Participant } from './components/Participant';
import { Sparkles, Users, Presentation, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  const [mode, setMode] = useState<'landing' | 'presenter' | 'participant'>('landing');
  const [room, setRoom] = useState<Room | null>(null);

  // Form states
  const [createTitle, setCreateTitle] = useState('Pelatihan DPPP InixJogja');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Parse URL hash for easy QR join: #join-123456
    const hash = window.location.hash;
    if (hash.startsWith('#join-')) {
      const code = hash.replace('#join-', '').trim();
      if (code) {
        setJoinCode(code);
      }
    }
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    socket.emit('create-room', { title: createTitle }, (res) => {
      setLoading(false);
      if (res.success && res.room) {
        setRoom(res.room);
        setMode('presenter');
      } else {
        setErrorMessage(res.error || 'Gagal membuat ruangan kuis');
      }
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) {
      setErrorMessage('Harap isi PIN dan Nama lengkap Anda');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    socket.emit('join-room', { code: joinCode.trim(), name: joinName.trim() }, (res) => {
      setLoading(false);
      if (res.success && res.room) {
        setRoom(res.room);
        setMode('participant');
      } else {
        setErrorMessage(res.error || 'PIN Ruangan tidak ditemukan atau salah.');
      }
    });
  };

  if (mode === 'presenter' && room) {
    return <Presenter room={room} onExit={() => { setRoom(null); setMode('landing'); }} />;
  }

  if (mode === 'participant' && room) {
    return <Participant room={room} participantName={joinName} onLeave={() => { setRoom(null); setMode('landing'); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-sky-500/20">
            IP
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white block">InixPoint</span>
            <span className="text-xs text-brand-400 font-medium -mt-1 block">Platform Interaktif Pembelajaran & Kuis</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Browser-to-Browser Realtime</span>
        </div>
      </header>

      {/* Hero & Dual Forms */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-8 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Interaksi Kelas Nyata, Tanpa Ribet Add-in
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Jalankan kuis pilihan ganda, word cloud, jawaban singkat, hingga kanvas gambar langsung di browser.
          </p>
        </div>

        {errorMessage && (
          <div className="w-full max-w-md mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-sm text-center">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* JOIN CARD (Peserta) */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-brand-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Users className="w-4 h-4" />
                <span>Untuk Peserta</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-4">Gabung ke Sesi</h2>
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Kode PIN Ruangan</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 829104"
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-center text-xl font-bold tracking-widest px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Nama Lengkap / Panggilan</label>
                  <input
                    type="text"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50 mt-2"
                >
                  <span>Masuk Sebagai Peserta</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-4">
              Dapat dibuka lewat browser HP atau laptop tanpa instalasi.
            </p>
          </div>

          {/* HOST CARD (Trainer/Presenter) */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Presentation className="w-4 h-4" />
                <span>Untuk Presenter / Trainer</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-4">Buka Ruangan Baru</h2>
              <form onSubmit={handleCreateRoom} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Judul Sesi / Kelas</label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="Judul kelas..."
                    className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Fitur Kuis Interaktif Siap Pakai:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                    <li>Pilihan Ganda (Multiple Choice) & Kunci</li>
                    <li>Word Cloud dinamis berbasis frekuensi</li>
                    <li>Tanya Jawab Singkat (Short Answer)</li>
                    <li>Kanvas Corat-coret (Slide Drawing)</li>
                  </ul>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl border border-slate-600 flex items-center justify-center space-x-2 transition disabled:opacity-50 mt-2"
                >
                  <span>Mulai Sebagai Presenter</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-4">
              Dapat ditampilkan di proyektor kelas dengan kode PIN & QR Code.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800 text-center text-xs text-slate-500">
        InixPoint &bull; Dikembangkan untuk Inovasi &amp; Riset Edukasi DPPP InixJogja &bull; 2026
      </footer>
    </div>
  );
};
