import React, { useState, useEffect } from 'react';
import { socket } from '../lib/socket';
import { Room, Question, Answer, QuestionType } from '@inixpoint/shared';
import { QRCodeSVG } from 'qrcode.react';
import { Leaderboard } from './Leaderboard';
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
  Trophy,
  Link,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Clock,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Quote
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
  const [matchingPairs, setMatchingPairs] = useState<Array<{ id: string; left: string; right: string }>>([
    { id: '1', left: 'Indonesia', right: 'Jakarta' },
    { id: '2', left: 'Jepang', right: 'Tokyo' },
    { id: '3', left: 'Perancis', right: 'Paris' }
  ]);
  const [correctIndex, setCorrectIndex] = useState<number | undefined>(undefined);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showResponses, setShowResponses] = useState(true);
  const [activeShortAnswerIndex, setActiveShortAnswerIndex] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const bgmIntervalRef = React.useRef<any>(null);
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

      if (ans.pointsAwarded !== undefined) {
        setRoom(prev => {
          const p = prev.participants[ans.participantId];
          if (!p) return prev;
          const newAnsweredCount = (p.answeredCount || 0) + 1;
          const starsEarned = ans.starsEarned ?? (ans.isCorrect ? 2 : 1);
          const totalMs = (p.totalResponseTimeMs || 0) + ((ans.responseDurationSec || 2) * 1000);
          const avgSpeed = Number(((totalMs / newAnsweredCount) / 1000).toFixed(1));
          return {
            ...prev,
            participants: {
              ...prev.participants,
              [ans.participantId]: {
                ...p,
                score: (p.score || 0) + (ans.pointsAwarded || 0),
                answeredCount: newAnsweredCount,
                correctCount: (p.correctCount || 0) + (ans.isCorrect ? 1 : 0),
                stars: (p.stars || 0) + starsEarned,
                totalResponseTimeMs: totalMs,
                averageSpeedSec: avgSpeed
              }
            }
          };
        });
      }
    });

    return () => {
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('answer-received');
    };
  }, []);

  // Timer interval for active questions
  useEffect(() => {
    if (room.currentQuestion?.status !== 'active') return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [room.currentQuestion?.status]);

  // Keyboard navigation for Short Answer Lightbox Carousel
  useEffect(() => {
    if (activeShortAnswerIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveShortAnswerIndex(null);
      if (e.key === 'ArrowLeft') {
        setActiveShortAnswerIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : receivedAnswers.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setActiveShortAnswerIndex((prev) => (prev !== null && prev < receivedAnswers.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeShortAnswerIndex, receivedAnswers.length]);

  // ponytail: Web Audio synth for classroom quiz ambience; upgrade to audio files if custom MP3 requested
  useEffect(() => {
    if (!isBgmPlaying || room.currentQuestion?.status !== 'active') {
      if (bgmIntervalRef.current) clearInterval(bgmIntervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const notes = [261.63, 329.63, 392.00, 523.25];
      let noteIdx = 0;

      bgmIntervalRef.current = setInterval(() => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[noteIdx % notes.length], ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        noteIdx++;
      }, 500);
    } catch {
      // AudioContext blocked or not supported
    }

    return () => {
      if (bgmIntervalRef.current) clearInterval(bgmIntervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [isBgmPlaying, room.currentQuestion?.status]);

  const handleAdd15s = () => {
    setTimerSeconds((s) => s + 15);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
      } : activeTab === 'matching' ? {
        pairs: matchingPairs
          .filter(p => p.left.trim() && p.right.trim())
          .map((p, idx) => ({ id: `pair_${idx + 1}`, left: p.left.trim(), right: p.right.trim() }))
      } : undefined
    };

    setReceivedAnswers([]);
    setTimerSeconds(0);
    setShowResponses(true);
    setActiveShortAnswerIndex(null);
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
    setIsBgmPlaying(false);
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

              <button
                type="button"
                onClick={() => setActiveTab('matching')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeTab === 'matching' 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <Link className="w-4 h-4" />
                <span>Matching</span>
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

              {activeTab === 'matching' && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-semibold px-1">
                    <span>Pasangan Kuis (Kiri ↔ Kanan Kunci)</span>
                    {matchingPairs.length < 6 && (
                      <button
                        type="button"
                        onClick={() => setMatchingPairs(prev => [...prev, { id: String(Date.now()), left: '', right: '' }])}
                        className="text-brand-400 hover:text-brand-300 flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Pasangan</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {matchingPairs.map((pair, idx) => (
                      <div key={pair.id} className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-slate-700 rounded text-center text-xs font-bold text-brand-300 flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={pair.left}
                          placeholder="Item kiri..."
                          onChange={(e) => {
                            const next = [...matchingPairs];
                            next[idx] = { ...next[idx], left: e.target.value };
                            setMatchingPairs(next);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 text-sm px-3 py-1.5 rounded-lg text-white placeholder-slate-500"
                        />
                        <span className="text-slate-500 font-bold">↔</span>
                        <input
                          type="text"
                          value={pair.right}
                          placeholder="Pasangan benar..."
                          onChange={(e) => {
                            const next = [...matchingPairs];
                            next[idx] = { ...next[idx], right: e.target.value };
                            setMatchingPairs(next);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 text-sm px-3 py-1.5 rounded-lg text-white placeholder-slate-500"
                        />
                        {matchingPairs.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setMatchingPairs(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
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
              </div>          ) : !showResponses && room.currentQuestion.status === 'active' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-slate-700/60 rounded-xl my-4">
              <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <EyeOff className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-slate-200">Tampilan Respons Disembunyikan</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
                Jawaban peserta tetap tercatat secara rahasia. Tekan tombol <strong className="text-amber-300 font-semibold">Hidden</strong> di dock kontrol bawah untuk menampilkan kembali ke audiens.
              </p>
            </div>            ) : (
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
                  <div className="space-y-3 p-1">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-400 font-semibold">
                        💡 Klik kartu untuk zoom proyektor & navigasi carousel
                      </span>
                      <span className="text-xs text-brand-300 font-mono font-bold bg-slate-700/60 px-2 py-0.5 rounded-md">
                        {receivedAnswers.length} Jawaban
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {receivedAnswers.length === 0 ? (
                        <p className="col-span-full text-center text-xs text-slate-500 py-8">
                          Menunggu jawaban teks dari audiens...
                        </p>
                      ) : (
                        receivedAnswers.map((ans, idx) => (
                          <div 
                            key={ans.id} 
                            onClick={() => setActiveShortAnswerIndex(idx)}
                            className="group bg-slate-700/60 hover:bg-slate-700 border border-slate-600 hover:border-amber-400/60 p-3.5 rounded-xl flex flex-col justify-between cursor-pointer transition shadow hover:shadow-lg relative"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <Quote className="w-4 h-4 text-amber-400/80 rotate-180" />
                              <span className="text-[10px] text-slate-400 group-hover:text-amber-300 flex items-center">
                                <Maximize2 className="w-3 h-3 mr-1" /> Zoom
                              </span>
                            </div>
                            <p className="text-sm text-slate-100 whitespace-pre-wrap line-clamp-4">{ans.content}</p>
                            <span className="text-xs text-brand-300 font-semibold mt-3 block text-right">
                              — {ans.participantName}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
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

                {/* MATCHING RESULTS DISPLAY */}
                {room.currentQuestion.type === 'matching' && (
                  <div className="space-y-6 py-2">
                    {/* Answer Key Grid */}
                    <div className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-3 flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                        Kunci Pasangan yang Benar
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {matchingPairs.filter(p => p.left && p.right).map((pair, idx) => (
                          <div key={idx} className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-lg flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200">{pair.left}</span>
                            <span className="text-slate-500 font-bold mx-2">↔</span>
                            <span className="font-semibold text-emerald-400">{pair.right}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Participant Responses List */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Respons Peserta ({receivedAnswers.length})
                        </p>
                        <span className="text-xs text-slate-400">
                          {receivedAnswers.filter(a => a.isCorrect).length} dari {receivedAnswers.length} menjawab 100% tepat
                        </span>
                      </div>

                      {receivedAnswers.length === 0 ? (
                        <p className="text-center text-xs text-slate-500 py-8">
                          Menunggu peserta mencocokkan pasangan...
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {receivedAnswers.map((ans) => {
                            let parsed: Record<string, string> = {};
                            try {
                              parsed = JSON.parse(ans.content);
                            } catch {
                              parsed = {};
                            }
                            return (
                              <div 
                                key={ans.id} 
                                className={`border p-3.5 rounded-xl flex flex-col justify-between ${
                                  ans.isCorrect 
                                    ? 'bg-emerald-950/20 border-emerald-500/40' 
                                    : 'bg-slate-800/80 border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-bold text-sm text-slate-200">{ans.participantName}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                    ans.isCorrect 
                                      ? 'bg-emerald-500/20 text-emerald-300' 
                                      : 'bg-brand-500/20 text-brand-300'
                                  }`}>
                                    +{ans.pointsAwarded ?? 0} Poin {ans.isCorrect && '✓'}
                                  </span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  {matchingPairs.filter(p => p.left && p.right).map((pair) => {
                                    const userChoice = parsed[pair.id];
                                    const matchCorrect = userChoice === pair.right;
                                    return (
                                      <div key={pair.id} className="flex justify-between items-center text-slate-300">
                                        <span className="truncate">{pair.left} → {userChoice || '—'}</span>
                                        <span className={matchCorrect ? 'text-emerald-400 font-bold ml-2' : 'text-rose-400 ml-2'}>
                                          {matchCorrect ? '✓' : '✕'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Leaderboard Section - Always Visible */}
            {room.currentQuestion && (
              <div className="mt-6">
                <Leaderboard 
                  participants={Object.values(room.participants || {})} 
                  title="🏆 Live Leaderboard" 
                />
              </div>
            )}

            {/* Universal Live Toolbar Dock (ClassPoint Style) */}
            {room.currentQuestion?.status === 'active' && (
              <div className="sticky bottom-0 mt-6 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 shadow-2xl rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 z-20">
                {/* Left: Live Participants Counter & Timer */}
                <div className="flex items-center space-x-3 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-300 font-semibold bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                    <Users className="w-3.5 h-3.5 text-brand-400" />
                    <span>{receivedAnswers.length} / {participantList.length}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 font-mono text-emerald-400 font-bold">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{formatTime(timerSeconds)}</span>
                    <button
                      type="button"
                      onClick={handleAdd15s}
                      className="ml-2 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-0.5 rounded font-sans font-semibold transition"
                      title="Tambah 15 detik"
                    >
                      +15s
                    </button>
                  </div>
                </div>

                {/* Center: Close submission action button */}
                <div>
                  <button
                    type="button"
                    onClick={handleCloseQuestion}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-lg transition flex items-center space-x-2"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Close submission</span>
                  </button>
                </div>

                {/* Right: Responses Hide/Show & Music Ambience */}
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowResponses(prev => !prev)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border font-semibold transition ${
                      showResponses
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    }`}
                    title={showResponses ? 'Sembunyikan jawaban di proyektor' : 'Tampilkan kembali jawaban'}
                  >
                    {showResponses ? <Eye className="w-3.5 h-3.5 text-brand-400" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{showResponses ? 'Responses' : 'Hidden'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBgmPlaying(prev => !prev)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border font-semibold transition ${
                      isBgmPlaying
                        ? 'bg-brand-600 border-brand-500 text-white shadow'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                    title={isBgmPlaying ? 'Matikan musik' : 'Putar audio ambience kuis'}
                  >
                    {isBgmPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>Music</span>
                  </button>
                </div>
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

      {/* Short Answer Zoom Carousel Lightbox (ClassPoint Modal Style) */}
      {activeShortAnswerIndex !== null && receivedAnswers[activeShortAnswerIndex] && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setActiveShortAnswerIndex(null)}
        >
          <div 
            className="relative max-w-2xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar Header */}
            <div className="w-full flex items-center justify-between text-slate-300 text-xs font-semibold mb-3 px-2">
              <span className="uppercase tracking-wider text-brand-300">
                Short Answer • Respons {activeShortAnswerIndex + 1} dari {receivedAnswers.length}
              </span>
              <button
                type="button"
                onClick={() => setActiveShortAnswerIndex(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Lightbox Card (ClassPoint Warm Pastel Note Style) */}
            <div className="relative w-full bg-[#fef9c3] text-slate-900 border-4 border-amber-300/80 rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col items-center justify-between min-h-[340px]">
              {/* Quote Icon */}
              <div className="text-amber-700/60 mb-3">
                <Quote className="w-12 h-12 rotate-180" />
              </div>

              {/* Answer Content */}
              <p className="text-xl sm:text-2xl font-serif text-center font-bold text-slate-900 leading-relaxed max-h-[360px] overflow-y-auto px-2">
                {receivedAnswers[activeShortAnswerIndex].content}
              </p>

              {/* Participant Name Badge */}
              <div className="mt-8 pt-4 border-t border-amber-300/60 w-full flex items-center justify-center space-x-2">
                <span className="w-8 h-8 bg-amber-300 text-amber-900 rounded-full flex items-center justify-center font-black text-xs shadow-sm">
                  {receivedAnswers[activeShortAnswerIndex].participantName.charAt(0).toUpperCase()}
                </span>
                <span className="text-base font-bold text-amber-950 font-sans">
                  {receivedAnswers[activeShortAnswerIndex].participantName}
                </span>
              </div>
            </div>

            {/* Carousel Navigation Buttons & Counter */}
            <div className="flex items-center space-x-6 mt-6">
              <button
                type="button"
                onClick={() => setActiveShortAnswerIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : receivedAnswers.length - 1))}
                className="w-12 h-12 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white flex items-center justify-center transition border border-slate-600 shadow-xl"
                title="Jawaban sebelumnya (Arrow Left)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <span className="text-sm text-slate-200 font-mono font-bold bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700">
                {activeShortAnswerIndex + 1} / {receivedAnswers.length}
              </span>

              <button
                type="button"
                onClick={() => setActiveShortAnswerIndex((prev) => (prev !== null && prev < receivedAnswers.length - 1 ? prev + 1 : 0))}
                className="w-12 h-12 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white flex items-center justify-center transition border border-slate-600 shadow-xl"
                title="Jawaban selanjutnya (Arrow Right)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
