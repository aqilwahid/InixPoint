import React, { useState, useEffect } from 'react';
import { socket } from './lib/socket';
import { Room } from '@inixpoint/shared';
import { Presenter } from './components/Presenter';
import { Participant } from './components/Participant';
import { Users, Presentation, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  const [mode, setMode] = useState<'landing' | 'presenter' | 'participant'>('landing');
  const [room, setRoom] = useState<Room | null>(null);
  const [hostToken, setHostToken] = useState('');

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

    socket.emit('create-room', { title: createTitle }, (res: any) => {
      setLoading(false);
      if (res.success && res.room && res.hostToken) {
        setRoom(res.room);
        setHostToken(res.hostToken);
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

    socket.emit('join-room', { code: joinCode.trim(), name: joinName.trim() }, (res: any) => {
      setLoading(false);
      if (res.success && res.room) {
        setRoom(res.room);
        setMode('participant');
      } else {
        setErrorMessage(res.error || 'PIN Ruangan tidak ditemukan atau salah.');
      }
    });
  };

  if (mode === 'presenter' && room && hostToken) {
    return <Presenter room={room} hostToken={hostToken} onExit={() => { setRoom(null); setHostToken(''); setMode('landing'); }} />;
  }

  if (mode === 'participant' && room) {
    return <Participant room={room} participantName={joinName} onLeave={() => { setRoom(null); setMode('landing'); }} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col selection:bg-primary-600 selection:text-white">
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-neutral-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center font-serif font-bold text-white text-lg shadow-md">
            IP
          </div>
          <div>
            <span className="font-serif font-bold text-lg text-neutral-900 block">InixPoint</span>
            <span className="text-xs text-primary-600 font-medium block">Platform Pembelajaran Interaktif</span>
          </div>
        </div>
        <div className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full border border-primary-200 font-medium flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <span>Realtime Browser</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-12 sm:py-16 border-b border-neutral-200 bg-gradient-to-b from-primary-50 to-neutral-50">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 mb-4 leading-tight">
            Kelas Interaktif Tanpa Ribet
          </h1>
          <p className="text-lg text-neutral-600 max-w-xl mx-auto">
            Jalankan kuis pilihan ganda, word cloud, jawaban singkat, dan kanvas gambar langsung di browser. Tanpa instalasi, hanya browser dan WiFi.
          </p>
        </div>
      </section>

      {/* Main Forms */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center w-full">
        {errorMessage && (
          <div className="w-full mb-8 p-4 bg-error/10 border border-error/30 text-error rounded-lg text-sm text-center font-medium">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* JOIN CARD - Peserta */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-xl text-neutral-900">Gabung Sesi</h2>
                <p className="text-xs text-neutral-500">Untuk peserta / audiens</p>
              </div>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4 flex-1 flex flex-col">
              <div>
                <label className="text-sm font-semibold text-neutral-700 block mb-2">Kode PIN</label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan 6 digit"
                  className="input-base font-mono text-center text-2xl font-bold tracking-widest"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-neutral-700 block mb-2">Nama Anda</label>
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="Nama lengkap atau panggilan"
                  className="input-base"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary mt-auto w-full flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-xs text-neutral-500 mt-6 text-center pt-6 border-t border-neutral-200">
              Bisa dibuka dari HP atau laptop. Tidak perlu instalasi apapun.
            </p>
          </div>

          {/* HOST CARD - Presenter */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-secondary-100 text-secondary-700 flex items-center justify-center">
                <Presentation className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-xl text-neutral-900">Buat Ruangan</h2>
                <p className="text-xs text-neutral-500">Untuk presenter / trainer</p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 flex-1 flex flex-col">
              <div>
                <label className="text-sm font-semibold text-neutral-700 block mb-2">Judul Sesi</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Nama kelas atau topik"
                  className="input-base"
                />
              </div>

              <div className="p-4 bg-secondary-50 rounded-lg border border-secondary-200 space-y-2">
                <p className="font-semibold text-secondary-900 text-sm">Fitur Siap Pakai:</p>
                <ul className="text-xs text-secondary-700 space-y-1.5">
                  <li className="flex items-start space-x-2">
                    <span className="text-secondary-500 mt-0.5">•</span>
                    <span><strong>Pilihan Ganda</strong> dengan kunci jawaban otomatis</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-secondary-500 mt-0.5">•</span>
                    <span><strong>Word Cloud</strong> dari respons peserta</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-secondary-500 mt-0.5">•</span>
                    <span><strong>Tanya Jawab Singkat</strong> text real-time</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-secondary-500 mt-0.5">•</span>
                    <span><strong>Kanvas Gambar</strong> dari peserta</span>
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-accent mt-auto w-full flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>Mulai Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-xs text-neutral-500 mt-6 text-center pt-6 border-t border-neutral-200">
              Dapatkan QR code & PIN untuk dibagikan ke peserta.
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
