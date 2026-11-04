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
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center font-serif font-bold text-white text-lg">
              IP
            </div>
            <div>
              <span className="font-serif font-bold text-neutral-900">InixPoint</span>
              <span className="text-xs text-primary-600 block font-medium">Presenter Control</span>
            </div>
          </div>
          <div className="h-6 w-px bg-neutral-300" />
          <h2 className="text-sm font-semibold text-neutral-700 max-w-xs truncate">{room.title}</h2>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="btn-secondary flex items-center space-x-2 text-sm"
          >
            <QrCode className="w-4 h-4" />
            <span className="font-mono font-bold">{room.code}</span>
          </button>

          <div className="flex items-center space-x-1.5 bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-700">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span>{participantList.filter(p => p.connected).length} Peserta</span>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary flex items-center space-x-1.5 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Laporan</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="text-sm font-semibold text-error hover:text-error/80 transition"
          >
            Akhiri
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question Builder */}
        <aside className="w-full md:w-96 border-r border-neutral-200 overflow-y-auto bg-white">
          <div className="p-6 space-y-6">
            {/* Question Type Selector */}
            <div>
              <h3 className="font-serif font-bold text-neutral-900 mb-3">Jenis Pertanyaan</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'multiple_choice', label: 'Pilihan Ganda', icon: BarChart3 },
                  { type: 'word_cloud', label: 'Word Cloud', icon: Cloud },
                  { type: 'short_answer', label: 'Tanya Jawab', icon: MessageSquare },
                  { type: 'slide_drawing', label: 'Gambar', icon: PenTool }
                ].map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveTab(type as QuestionType)}
                    className={`flex flex-col items-center justify-center py-3 px-3 rounded-lg font-semibold text-xs transition border ${ activeTab === type
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Question Input */}
            <div>
              <label className="text-sm font-semibold text-neutral-700 block mb-2">Pertanyaan</label>
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Tuliskan pertanyaan atau instruksi untuk peserta..."
                className="input-base resize-none h-24"
              />
            </div>

            {/* Multiple Choice Options */}
            {activeTab === 'multiple_choice' && (
              <div>
                <label className="text-sm font-semibold text-neutral-700 block mb-2">Pilihan Jawaban</label>
                <div className="space-y-2">
                  {optionsInput.map((opt, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="w-8 h-8 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center font-bold text-xs font-serif">
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
                        className="input-base flex-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setCorrectIndex(correctIndex === idx ? undefined : idx)}
                        className={`px-2.5 py-1.5 rounded text-xs font-semibold border transition ${
                          correctIndex === idx
                            ? 'bg-success text-white border-success'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
                        }`}
                      >
                        {correctIndex === idx ? '✓' : ''}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleStartQuestion}
                className="btn-primary flex-1 flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Mulai Pertanyaan</span>
              </button>
              {room.currentQuestion?.status === 'active' && (
                <button
                  type="button"
                  onClick={handleCloseQuestion}
                  className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                >
                  <Square className="w-4 h-4" />
                  <span>Tutup</span>
                </button>
              )}
            </div>

            {/* Live Status */}
            {room.currentQuestion?.status === 'active' && (
              <div className="p-3 bg-primary-50 border-l-4 border-primary-600 rounded text-sm">
                <p className="font-semibold text-primary-900 flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
                  <span>Pertanyaan Sedang Live</span>
                </p>
                <p className="text-xs text-primary-700 mt-1">{receivedAnswers.length} jawaban masuk</p>
              </div>
            )}
          </div>
        </aside>

        {/* Right: Results Display */}
        <main className="flex-1 overflow-y-auto p-6">
          {!room.currentQuestion || room.currentQuestion.status !== 'active' ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Trophy className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="font-serif font-bold text-xl text-neutral-700 mb-2">Siap Memulai</h3>
                <p className="text-neutral-500">Pilih jenis pertanyaan dan klik "Mulai Pertanyaan" untuk memulai sesi interaktif.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                <h4 className="font-serif font-bold text-lg text-neutral-900 mb-2">{room.currentQuestion.prompt}</h4>
                <p className="text-sm text-neutral-600">Tipe: <strong>{room.currentQuestion.type.replace('_', ' ')}</strong></p>
              </div>

              {/* Results Visualization */}
              {activeTab === 'multiple_choice' && (
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                  <h5 className="font-semibold text-neutral-900 mb-4">Hasil Pilihan Ganda</h5>
                  <div className="space-y-3">
                    {optionsInput.map((opt, idx) => {
                      const tally = mcTally[idx];
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-neutral-700">
                              {String.fromCharCode(65 + idx)}. {opt}
                            </span>
                            <span className="text-sm font-bold text-primary-600">{tally.count} ({tally.percent}%)</span>
                          </div>
                          <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary-600 h-full transition-all"
                              style={{ width: `${tally.percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'word_cloud' && (
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                  <h5 className="font-semibold text-neutral-900 mb-4">Word Cloud</h5>
                  <div className="flex flex-wrap gap-3">
                    {wordCloudTally.slice(0, 15).map(([word, count], idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg font-medium text-sm"
                        style={{ fontSize: `${0.75 + (count / Math.max(...wordCloudTally.map(x => x[1]))) * 0.5}rem` }}
                      >
                        {word} <span className="text-xs opacity-75">({count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'short_answer' && (
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                  <h5 className="font-semibold text-neutral-900 mb-4">Jawaban Peserta ({receivedAnswers.length})</h5>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {receivedAnswers.map((ans, idx) => (
                      <div key={idx} className="p-2.5 bg-neutral-50 rounded border border-neutral-200 text-sm">
                        <p className="font-medium text-neutral-900">{ans.participantId || 'Peserta'}</p>
                        <p className="text-neutral-700 mt-1">{ans.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leaderboard Always Visible */}
              <Leaderboard participants={Object.values(room.participants || {})} title="📊 Leaderboard Real-time" />
            </div>
          )}
        </main>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
            <h3 className="font-serif font-bold text-2xl text-neutral-900 mb-6">Bagikan Kode Ruangan</h3>
            
            <div className="bg-neutral-50 p-6 rounded-lg mb-6 flex justify-center">
              <QRCodeSVG
                value={joinUrl}
                size={200}
                level="H"
                includeMargin={true}
                fgColor="#3e1f85"
                bgColor="#faf9f7"
              />
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-xs text-neutral-600 font-semibold mb-1">Kode PIN:</p>
                <div className="bg-primary-50 border-2 border-primary-300 rounded-lg px-4 py-3 text-center">
                  <p className="font-mono font-black text-2xl text-primary-700">{room.code}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-neutral-600 font-semibold mb-1">Atau Buka Link:</p>
                <input
                  type="text"
                  readOnly
                  value={joinUrl}
                  className="w-full bg-neutral-100 border border-neutral-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="btn-primary w-full"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
