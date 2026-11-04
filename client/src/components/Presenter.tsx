import React, { useState, useEffect } from 'react';
import { socket } from '../lib/socket';
import { Room, Question, Answer, QuestionType } from '@inixpoint/shared';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, 
  BarChart3, 
  Cloud, 
  MessageSquare, 
  PenTool, 
  Play, 
  Square, 
  Download, 
  QrCode,
  Sparkles,
  Trophy
} from 'lucide-react';

interface PresenterProps {
  room: Room;
  onExit: () => void;
}

export const Presenter: React.FC<PresenterProps> = ({ room: initialRoom, onExit }) => {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [activeTab, setActiveTab] = useState<QuestionType>('multiple_choice');
  const [promptInput, setPromptInput] = useState('');
  const [optionsInput, setOptionsInput] = useState(['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D']);
  const [correctIndex, setCorrectIndex] = useState<number | undefined>(undefined);
  const [showQRModal, setShowQRModal] = useState(false);
  const [receivedAnswers, setReceivedAnswers] = useState<Answer[]>([]);

  const participantList = Object.values(room.participants || {});
  const joinUrl = `${window.location.origin}/#join-${room.code}`;

  useEffect(() => {
    socket.on('participant-joined', (p) => {
      setRoom((prev) => ({
        ...prev,
        participants: { ...prev.participants, [p.id]: p }
      }));
    });

    socket.on('participant-left', (pId) => {
      setRoom((prev) => {
        if (!prev.participants[pId]) return prev;
        return {
          ...prev,
          participants: {
            ...prev.participants,
            [pId]: { ...prev.participants[pId], connected: false }
          }
        };
      });
    });

    socket.on('answer-received', (ans) => {
      setReceivedAnswers((prev) => {
        const idx = prev.findIndex(a => a.participantId === ans.participantId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = ans;
          return next;
        }
        return [...prev, ans];
      });
    });

    return () => {
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('answer-received');
    };
  }, []);

  const handleStartQuestion = () => {
    if (!promptInput.trim()) {
      alert('Silakan tuliskan pertanyaan/instruksi terlebih dahulu.');
      return;
    }

    const questionPayload: Omit<Question, 'id' | 'status' | 'createdAt'> = {
      type: activeTab,
      prompt: promptInput.trim(),
      options: activeTab === 'multiple_choice' ? {
        choices: optionsInput.filter(o => o.trim().length > 0),
        correctIndex,
        hasCorrectAnswer: correctIndex !== undefined
      } : undefined
    };

    setReceivedAnswers([]);
    socket.emit('start-question', {
      code: room.code,
      question: questionPayload
    });

    setRoom(prev => ({
      ...prev,
      currentQuestion: {
        ...questionPayload,
        id: 'temp',
        status: 'active',
        createdAt: Date.now()
      }
    }));
  };

  const handleCloseQuestion = () => {
    if (!room.currentQuestion) return;
    socket.emit('close-question', {
      code: room.code,
      questionId: room.currentQuestion.id
    });
    setRoom(prev => ({
      ...prev,
      currentQuestion: prev.currentQuestion ? { ...prev.currentQuestion, status: 'closed' } : undefined
    }));
  };

  const handleExportCSV = () => {
    window.open(`http://${window.location.hostname}:4000/api/reports/${room.code}/csv`, '_blank');
  };

  // Multiple choice tally
  const mcTally = optionsInput.map((_, idx) => {
    const count = receivedAnswers.filter(a => a.content === String(idx)).length;
    const total = receivedAnswers.length;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return { count, percent };
  });

  // Word Cloud tally (word frequency)
  const wordCloudTally = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const a of receivedAnswers) {
      const word = a.content.trim().toLowerCase();
      if (!word) continue;
      map.set(word, (map.get(word) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [receivedAnswers]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Bar Presenter */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-black text-white text-lg shadow-sm">
              IP
            </div>
            <div>
              <span className="font-extrabold text-white text-lg tracking-tight">InixPoint</span>
              <span className="text-xs text-brand-400 block -mt-1 font-medium">Presenter Control Room</span>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div className="text-sm font-semibold text-slate-300">
            {room.title}
          </div>
        </div>

        {/* Room Code & Stats */}
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-1.5 rounded-lg font-bold text-sm shadow transition"
          >
            <QrCode className="w-4 h-4" />
            <span>PIN: <strong className="font-mono text-base">{room.code}</strong></span>
          </button>

          <div className="flex items-center space-x-1.5 bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>{participantList.filter(p => p.connected).length} Peserta</span>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 transition"
            title="Ekspor CSV Hasil Sesi"
          >
            <Download className="w-4 h-4 text-brand-400" />
            <span>Laporan</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="text-xs text-rose-400 hover:text-rose-300 ml-2"
          >
            Akhiri
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left / Center: Interactive Stage */}
        <main className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Question Launcher / Ribbon (mirip toolbar ClassPoint di gambar) */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6 shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-1.5 text-brand-400" /> Pilih Tipe Interaksi Kuis
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('multiple_choice')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeTab === 'multiple_choice' 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Multiple Choice</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('word_cloud')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeTab === 'word_cloud' 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <Cloud className="w-4 h-4" />
                <span>Word Cloud</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('short_answer')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeTab === 'short_answer' 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Short Answer</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('slide_drawing')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeTab === 'slide_drawing' 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <PenTool className="w-4 h-4" />
                <span>Slide Drawing</span>
              </button>
            </div>

            {/* Config Fields */}
            <div className="space-y-3">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Tuliskan pertanyaan atau prompt untuk peserta..."
                className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />

              {activeTab === 'multiple_choice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {optionsInput.map((opt, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center font-bold text-xs text-brand-300">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...optionsInput];
                          next[idx] = e.target.value;
                          setOptionsInput(next);
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 text-sm px-3 py-1.5 rounded-lg text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setCorrectIndex(correctIndex === idx ? undefined : idx)}
                        className={`text-xs px-2 py-1 rounded font-medium border ${
                          correctIndex === idx 
                            ? 'bg-emerald-600 border-emerald-500 text-white' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Tandai sebagai kunci jawaban"
                      >
                        {correctIndex === idx ? 'Kunci ✓' : 'Kunci'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                {room.currentQuestion?.status === 'active' ? (
                  <button
                    type="button"
                    onClick={handleCloseQuestion}
                    className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl shadow transition"
                  >
                    <Square className="w-4 h-4" />
                    <span>Tutup Kuis & Kunci Jawaban</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartQuestion}
                    className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-5 py-2.5 rounded-xl shadow transition"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Mulai Kuis Ke Peserta</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Stage / Real-time Answer View */}
          <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {room.currentQuestion ? room.currentQuestion.prompt : 'Belum ada kuis yang aktif'}
                </h2>
                {room.currentQuestion && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tipe: <span className="uppercase text-brand-400 font-semibold">{room.currentQuestion.type.replace('_', ' ')}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-brand-400 font-mono">
                  {receivedAnswers.length}
                </span>
                <span className="text-xs text-slate-400 block font-medium">Respons Masuk</span>
              </div>
            </div>

            {/* Answer Display */}
            {!room.currentQuestion ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <BarChart3 className="w-16 h-16 stroke-1 text-slate-600 mb-2" />
                <p className="text-base font-semibold text-slate-400">Siap untuk berinteraksi dengan audiens</p>
                <p className="text-xs max-w-sm mt-1">Pilih tipe kuis di panel atas, ketik pertanyaan, lalu klik tombol "Mulai Kuis Ke Peserta".</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* MULTIPLE CHOICE VISUALIZER */}
                {room.currentQuestion.type === 'multiple_choice' && (
                  <div className="space-y-4 py-4 max-w-2xl mx-auto">
                    {optionsInput.map((opt, idx) => {
                      const tally = mcTally[idx];
                      const isCorrect = correctIndex === idx;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm font-semibold">
                            <span className="flex items-center">
                              <span className="w-6 h-6 rounded bg-slate-700 text-brand-300 inline-flex items-center justify-center mr-2 text-xs font-bold">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              {opt}
                              {isCorrect && (
                                <span className="ml-2 text-xs text-emerald-400 font-bold">✓ Kunci</span>
                              )}
                            </span>
                            <span className="font-mono text-slate-300">
                              {tally.count} ({tally.percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 h-6 rounded-lg overflow-hidden flex">
                            <div 
                              className={`h-full transition-all duration-500 rounded-lg ${
                                isCorrect ? 'bg-emerald-500' : 'bg-brand-500'
                              }`} 
                              style={{ width: `${tally.percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* WORD CLOUD VISUALIZER */}
                {room.currentQuestion.type === 'word_cloud' && (
                  <div className="flex-1 flex flex-wrap gap-3 items-center justify-center p-6 min-h-[220px]">
                    {wordCloudTally.length === 0 ? (
                      <p className="text-xs text-slate-500">Menunggu peserta mengirimkan kata...</p>
                    ) : (
                      wordCloudTally.map(([word, freq]) => {
                        const fontSize = Math.min(48, Math.max(16, 16 + freq * 8));
                        return (
                          <span
                            key={word}
                            style={{ fontSize: `${fontSize}px` }}
                            className="font-bold text-brand-300 hover:text-white transition px-2.5 py-1 rounded-lg bg-slate-700/60 inline-flex items-center shadow-sm"
                          >
                            {word}
                            {freq > 1 && (
                              <span className="ml-1.5 text-xs bg-brand-600 text-white rounded-full px-2 py-0.5">
                                {freq}
                              </span>
                            )}
                          </span>
                        );
                      })
                    )}
                  </div>
                )}

                {/* SHORT ANSWER FEED */}
                {room.currentQuestion.type === 'short_answer' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-2">
                    {receivedAnswers.length === 0 ? (
                      <p className="col-span-full text-center text-xs text-slate-500 py-8">
                        Menunggu jawaban teks dari audiens...
                      </p>
                    ) : (
                      receivedAnswers.map((ans) => (
                        <div key={ans.id} className="bg-slate-700/60 border border-slate-600 p-3.5 rounded-xl flex flex-col justify-between">
                          <p className="text-sm text-slate-100 whitespace-pre-wrap">{ans.content}</p>
                          <span className="text-xs text-brand-300 font-semibold mt-3 block text-right">
                            — {ans.participantName}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* SLIDE DRAWING GALLERY */}
                {room.currentQuestion.type === 'slide_drawing' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-2">
                    {receivedAnswers.length === 0 ? (
                      <p className="col-span-full text-center text-xs text-slate-500 py-8">
                        Menunggu peserta menggambar di kanvas...
                      </p>
                    ) : (
                      receivedAnswers.map((ans) => (
                        <div key={ans.id} className="bg-slate-700 border border-slate-600 rounded-xl overflow-hidden p-2 flex flex-col">
                          <img 
                            src={ans.content} 
                            alt={`Gambar dari ${ans.participantName}`} 
                            className="w-full aspect-[4/3] object-contain bg-white rounded-lg"
                          />
                          <span className="text-xs text-slate-200 font-semibold mt-2 text-center truncate">
                            {ans.participantName}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Connected Participants */}
        <aside className="w-full md:w-72 bg-slate-800/90 border-t md:border-t-0 md:border-l border-slate-700 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <Users className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Daftar Hadir ({participantList.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {participantList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Belum ada peserta yang bergabung. Bagikan PIN atau QR Code!
              </p>
            ) : (
              participantList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-700/50 text-xs"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className={`w-2 h-2 rounded-full ${p.connected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span className="font-semibold text-slate-200 truncate">{p.name}</span>
                  </div>
                  {p.score > 0 && (
                    <span className="text-amber-400 font-mono font-bold flex items-center">
                      <Trophy className="w-3 h-3 mr-0.5" /> {p.score}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* QR Code Big Screen Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-1">Bergabung ke InixPoint</h2>
            <p className="text-sm text-slate-500 mb-6">Scan QR code atau buka link dan masukkan PIN:</p>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mb-6 shadow-inner">
              <QRCodeSVG value={joinUrl} size={220} />
            </div>

            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-6">
              <span className="text-xs text-brand-600 uppercase font-bold tracking-wider block">Kode PIN Ruangan</span>
              <span className="text-5xl font-mono font-black text-brand-700 tracking-widest">{room.code}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition"
            >
              Tutup Layar PIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
