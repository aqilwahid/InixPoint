import React, { useState, useEffect } from 'react';
import { socket } from '../lib/socket';
import { 
  Room, 
  Question, 
  Answer, 
  QnaItem,
  QuestionType,
  QuickPollTemplate,
  QuickPollOptions,
  QuickPollOptionItem,
  Deck,
  BUILTIN_PLUGINS
} from '@inixpoint/shared';
import { QRCodeSVG } from 'qrcode.react';
import { Leaderboard } from './Leaderboard';
import { AnnotationToolkit } from './AnnotationToolkit';
import { DeckPresenter } from './DeckPresenter';
import { PluginSandbox } from './PluginSandbox';
import { PluginPlayground } from './PluginPlayground';
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
  Vote,
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
  Quote,
  Dice5,
  Timer,
  CheckCircle,
  HelpCircle,
  RotateCcw,
  FileImage,
  Gamepad2
} from 'lucide-react';

interface PresenterProps {
  room: Room;
  hostToken: string;
  onExit: () => void;
}

const POLL_TEMPLATES: Record<QuickPollTemplate, { name: string; options: QuickPollOptionItem[] }> = {
  likert_5: {
    name: 'Skala Likert (5 Tingkat)',
    options: [
      { id: 'strongly_agree', label: 'Strongly agree', emoji: '😃', color: '#10b981' },
      { id: 'agree', label: 'Agree', emoji: '🙂', color: '#84cc16' },
      { id: 'neutral', label: 'Neutral', emoji: '😐', color: '#f59e0b' },
      { id: 'disagree', label: 'Disagree', emoji: '🙁', color: '#f97316' },
      { id: 'strongly_disagree', label: 'Strongly disagree', emoji: '😡', color: '#ef4444' }
    ]
  },
  yes_no: {
  name: 'Ya / Tidak',
  options: [
      { id: 'yes', label: 'Ya / Setuju', emoji: '👍', color: '#10b981' },
      { id: 'no', label: 'Tidak', emoji: '👎', color: '#ef4444' },
      { id: 'unsure', label: 'Belum Yakin', emoji: '🤔', color: '#f59e0b' }
    ]
  },
  true_false: {
    name: 'Benar / Salah',
    options: [
      { id: 'true', label: 'Benar', emoji: '✅', color: '#10b981' },
      { id: 'false', label: 'Salah', emoji: '❌', color: '#ef4444' }
    ]
  },
  rating_5: {
    name: 'Rating Bintang (1 - 5)',
    options: [
      { id: '5', label: 'Sangat Baik (5★)', emoji: '🌟', color: '#f59e0b' },
      { id: '4', label: 'Baik (4★)', emoji: '⭐', color: '#84cc16' },
      { id: '3', label: 'Cukup (3★)', emoji: '⭐', color: '#3b82f6' },
      { id: '2', label: 'Kurang (2★)', emoji: '⭐', color: '#f97316' },
      { id: '1', label: 'Sangat Kurang (1★)', emoji: '⭐', color: '#ef4444' }
    ]
  }
};

export const Presenter: React.FC<PresenterProps> = ({ room: initialRoom, hostToken, onExit }) => {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [activeTab, setActiveTab] = useState<QuestionType>('multiple_choice');
  const [promptInput, setPromptInput] = useState('');
  const [optionsInput, setOptionsInput] = useState(['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D']);
  const [matchingPairs, setMatchingPairs] = useState<Array<{ id: string; left: string; right: string }>>([
    { id: '1', left: 'Indonesia', right: 'Jakarta' },
    { id: '2', left: 'Jepang', right: 'Tokyo' },
    { id: '3', left: 'Perancis', right: 'Paris' }
  ]);
  const [rankingItemsInput, setRankingItemsInput] = useState('Pertama\nKedua\nKetiga');
  const [fillAnswersInput, setFillAnswersInput] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [pollTemplate, setPollTemplate] = useState<QuickPollTemplate>('likert_5');
  const [correctIndex, setCorrectIndex] = useState<number | undefined>(undefined);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showResponses, setShowResponses] = useState(true);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [activeShortAnswerIndex, setActiveShortAnswerIndex] = useState<number | null>(null);
  const [answerQuery, setAnswerQuery] = useState('');
  const [showSessionSummary, setShowSessionSummary] = useState(false);

  // R5 Plugin Game state
  const [selectedPluginId, setSelectedPluginId] = useState<string>('tebak-cepat');
  const [pluginCountLeaderboard, setPluginCountLeaderboard] = useState<boolean>(true);
  const [showPlaygroundModal, setShowPlaygroundModal] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timeLimitSec, setTimeLimitSec] = useState(30);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const bgmIntervalRef = React.useRef<any>(null);
  const [receivedAnswers, setReceivedAnswers] = useState<Answer[]>([]);
  const [qnaItems, setQnaItems] = useState<QnaItem[]>(initialRoom.qna || []);

  const participantList = Object.values(room.participants || {});
  const joinUrl = `${window.location.origin}/#join-${room.code}`;
  const isQuestionActive = room.currentQuestion?.status === 'active';

  // R2 P-11: Random Name Picker state
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [pickedName, setPickedName] = useState<string | null>(null);

  // R2 P-12: Free Timer / Stopwatch state
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [freeTimerMode, setFreeTimerMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [freeTimerSeconds, setFreeTimerSeconds] = useState(180); // default 3 mins
  const [freeTimerRunning, setFreeTimerRunning] = useState(false);
  const [freeTimerInput, setFreeTimerInput] = useState(3);

  // R2 P-13: Annotation & Whiteboard state
  const [isAnnotationOpen, setIsAnnotationOpen] = useState(false);
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);

  // R2 D-01 s/d D-05: Deck PDF state
  const [deck, setDeck] = useState<Deck | null>(null);

  // Free timer interval
  useEffect(() => {
    let interval: any = null;
    if (freeTimerRunning) {
      interval = setInterval(() => {
        setFreeTimerSeconds((prev) => {
          if (freeTimerMode === 'countdown') {
            if (prev <= 1) {
              setFreeTimerRunning(false);
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [freeTimerRunning, freeTimerMode]);

  // ponytail: sync activeTab with running question type; upgrade to question queue later
  useEffect(() => {
    if (room.currentQuestion?.status === 'active') {
      setActiveTab(room.currentQuestion.type);
    }
  }, [room.currentQuestion?.status, room.currentQuestion?.type]);
  useEffect(() => {
  const slide = deck?.slides[deck.currentSlideIndex];
  if (slide) socket.emit('broadcast-slide', { code: room.code, hostToken, slide: { index: deck.currentSlideIndex, title: slide.title, imageUrl: slide.imageUrl } });
  }, [deck?.currentSlideIndex, deck?.slides, room.code, hostToken]);

  // ponytail: sync body dark background in presenter mode to eliminate white scroll bounce / gaps
  useEffect(() => {
    const originalBodyClass = document.body.className;
    document.body.classList.remove('bg-neutral-50', 'bg-slate-50');
    document.body.classList.add('bg-slate-900');
    return () => {
      document.body.className = originalBodyClass;
    };
  }, []);

  useEffect(() => {
    socket.on('participant-joined', (p) => {
      setRoom((prev) => ({
        ...prev,
        participants: { ...prev.participants, [p.id]: p }
      }));
    });

    socket.on('question-started', (q) => {
      setRoom((prev) => ({ ...prev, currentQuestion: q }));
      setTimerSeconds(0);
      setShowResponses(true);
      setReceivedAnswers([]);
    });

    socket.on('question-closed', () => {
      setRoom((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion ? { ...prev.currentQuestion, status: 'closed' } : undefined
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
    socket.on('qna-state', (items) => setQnaItems(items));
    socket.on('room-state', (nextRoom) => setRoom(nextRoom));
    socket.on('qna-updated', (item) => {
      setQnaItems((prev) => {
        const idx = prev.findIndex((existing) => existing.id === item.id);
        if (idx < 0) return [...prev, item];
        const next = [...prev];
        next[idx] = item;
        return next;
      });
    });

    return () => {
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('answer-received');
      socket.off('qna-state');
      socket.off('qna-updated');
      socket.off('room-state');
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

  const getTimeRemaining = (): number | null => {
    if (!room.currentQuestion?.timeLimitSec || !room.currentQuestion.timeStartedAt) return null;
    const elapsed = (Date.now() - room.currentQuestion.timeStartedAt) / 1000;
    return Math.max(0, Math.ceil(room.currentQuestion.timeLimitSec - elapsed));
  };

  const handleStartQuestion = () => {
    const selectedPlugin = BUILTIN_PLUGINS.find(p => p.manifest.id === selectedPluginId) || BUILTIN_PLUGINS[0];
    const finalPrompt = promptInput.trim() || (activeTab === 'quick_poll' ? 'Bagaimana pendapat atau pilihan Anda?' : activeTab === 'plugin_game' ? `Game Plugin: ${selectedPlugin.manifest.name}` : '');
    if (!finalPrompt) {
      alert('Silakan tuliskan pertanyaan/instruksi terlebih dahulu.');
      return;
    }
    const rankingItems = rankingItemsInput.split('\n').map(item => item.trim()).filter(Boolean);
    if (activeTab === 'ranking' && rankingItems.length < 2) {
      alert('Ranking memerlukan minimal dua item.');
      return;
    }

    const questionPayload: Omit<Question, 'id' | 'status' | 'createdAt'> = {
      type: activeTab,
      prompt: finalPrompt,
      timeLimitSec: timeLimitSec > 0 ? timeLimitSec : undefined,
      difficulty,
      correctAnswers: activeTab === 'short_answer' ? fillAnswersInput.split('\n').map(answer => answer.trim()).filter(Boolean) : undefined,
      options: activeTab === 'multiple_choice' ? {
        choices: optionsInput.filter(o => o.trim().length > 0),
        correctIndex,
        hasCorrectAnswer: correctIndex !== undefined
      } : activeTab === 'matching' ? {
        pairs: matchingPairs
          .filter(p => p.left.trim() && p.right.trim())
          .map((p, idx) => ({ id: `pair_${idx + 1}`, left: p.left.trim(), right: p.right.trim() }))
      } : activeTab === 'quick_poll' ? {
        template: pollTemplate,
        options: POLL_TEMPLATES[pollTemplate].options
      } : activeTab === 'ranking' ? {
        items: rankingItems,
        correctOrder: rankingItems
      } : undefined,
      slideImageUrl: activeTab === 'slide_drawing' ? deck?.slides[deck.currentSlideIndex]?.imageUrl : undefined,
      pluginConfig: activeTab === 'plugin_game' ? {
        pluginId: selectedPlugin.manifest.id,
        manifest: selectedPlugin.manifest,
        config: selectedPlugin.manifest.config ? Object.fromEntries(
          Object.entries(selectedPlugin.manifest.config).map(([k, v]) => [k, v.default])
        ) : {},
        countTowardsLeaderboard: pluginCountLeaderboard,
        html: selectedPlugin.html
      } : undefined
    };

    setReceivedAnswers([]);
    setTimerSeconds(0);
    setShowResponses(true);
    setActiveShortAnswerIndex(null);
    setAnswerQuery('');
    socket.emit('start-question', {
      code: room.code,
      hostToken,
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
      hostToken,
      code: room.code,
      questionId: room.currentQuestion.id
    });
    setRoom(prev => ({
      ...prev,
      currentQuestion: prev.currentQuestion ? { ...prev.currentQuestion, status: 'closed' } : undefined
    }));
  };

  const handleCloseRoom = () => {
    setIsBgmPlaying(false);
    if (room.currentQuestion?.status === 'active') handleCloseQuestion();
    socket.emit('close-room', { code: room.code, hostToken });
    setShowSessionSummary(true);
  };

  const handleExportCSV = () => {
    window.open(`http://${window.location.hostname}:4000/api/reports/${room.code}/csv`, '_blank');
  };
  const handleExportXLSX = () => {
  window.open(`http://${window.location.hostname}:4000/api/reports/${room.code}/xlsx`, '_blank');
  };
  const handleSlideChange = (slide: any) => {
  socket.emit('broadcast-slide', {
  code: room.code,
  hostToken,
  slide: { index: deck?.currentSlideIndex || 0, title: slide.title, imageUrl: slide.imageUrl }
  });
  };

  // R2 P-11: Start spinning random name
  const handleLaunchActivityPayload = (questionPayload: Omit<Question, 'id' | 'status' | 'createdAt'>) => {
    setReceivedAnswers([]);
    setTimerSeconds(0);
    setShowResponses(true);
    setActiveShortAnswerIndex(null);
    socket.emit('start-question', {
      code: room.code,
      hostToken,
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

  const handleInsertResultAsSlide = () => {
    if (!deck || !room.currentQuestion) return;
    const summarySlide = {
      id: `result_${Date.now()}`,
      type: 'result' as const,
      title: `Hasil: ${room.currentQuestion.prompt}`,
      resultData: {
        questionPrompt: room.currentQuestion.prompt,
        type: room.currentQuestion.type,
        answersCount: receivedAnswers.length,
      }
    };
    const nextSlides = [...deck.slides];
    nextSlides.splice(deck.currentSlideIndex + 1, 0, summarySlide);
    setDeck({
      ...deck,
      slides: nextSlides,
      pageCount: nextSlides.length,
      currentSlideIndex: deck.currentSlideIndex + 1,
    });
    alert('Hasil kuis berhasil disisipkan sebagai slide baru ke dalam deck!');
  };

  const handlePickRandomName = () => {
    const candidates = participantList.filter(p => p.connected);
    if (candidates.length === 0) {
      alert('Belum ada peserta yang tersambung.');
      return;
    }
    setIsPicking(true);
    setPickedName(null);
    let counter = 0;
    const maxCycles = 20;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * candidates.length);
      setPickedName(candidates[randomIdx].name);
      counter++;
      if (counter >= maxCycles) {
        clearInterval(interval);
        setIsPicking(false);
      }
    }, 100);
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
  const visibleAnswers = React.useMemo(() => {
    const query = answerQuery.trim().toLocaleLowerCase();
    return query ? receivedAnswers.filter((answer) => answer.content.toLocaleLowerCase().includes(query)) : receivedAnswers;
  }, [answerQuery, receivedAnswers]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-900 text-slate-100 flex flex-col w-full overflow-x-hidden">
      {/* Top Bar Presenter */}
      <header className="bg-slate-800 border-b border-slate-700 px-3 sm:px-6 py-2.5 sm:py-3 shadow-md z-30">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 max-w-full">
          {/* Logo & Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-600 flex items-center justify-center font-black text-white text-base sm:text-lg shadow-sm flex-shrink-0">
              IP
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">InixPoint</span>
                <span className="text-[10px] sm:text-xs text-brand-400 font-medium hidden sm:inline">Presenter Room</span>
              </div>
              <div className="text-xs font-semibold text-slate-300 truncate max-w-[130px] sm:max-w-xs md:max-w-md" title={room.title}>
                {room.title}
              </div>
            </div>
          </div>

          {/* Room Code & Stats */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-shrink-0">
            {/* R2 P-11: Name Picker */}
            <button
              type="button"
              onClick={() => {
                setShowPickerModal(true);
                setPickedName(null);
              }}
              className="flex items-center space-x-1 bg-slate-700 hover:bg-slate-600 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 transition"
              title="Pilih Nama Peserta Acak (Random Name Picker)"
            >
              <Dice5 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Acak Nama</span>
            </button>

            {/* R2 P-12: Free Timer / Stopwatch */}
            <button
              type="button"
              onClick={() => setShowTimerModal(true)}
              className="flex items-center space-x-1 bg-slate-700 hover:bg-slate-600 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 transition"
              title="Timer & Stopwatch Bebas"
            >
              <Timer className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">Timer</span>
            </button>

            {/* R2 P-13: Annotation & Whiteboard Tool */}
            <button
              type="button"
              onClick={() => {
                setIsAnnotationOpen(true);
                setIsWhiteboardActive(false);
              }}
              className="flex items-center space-x-1 bg-slate-700 hover:bg-slate-600 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 transition"
              title="Alat Anotasi: Pen, Stabilo, Laser Pointer & Whiteboard"
            >
              <PenTool className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Anotasi</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-white px-2.5 sm:px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm shadow transition flex-shrink-0"
              title="Tampilkan QR Code dan PIN"
            >
              <QrCode className="w-4 h-4 flex-shrink-0" />
              <span>PIN: <strong className="font-mono text-xs sm:text-base">{room.code}</strong></span>
            </button>

            <div className="flex items-center space-x-1 bg-slate-700 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 flex-shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
              <span>{participantList.filter(p => p.connected).length}<span className="hidden sm:inline"> Peserta</span></span>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center space-x-1 bg-slate-700 hover:bg-slate-600 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 transition flex-shrink-0"
              title="Ekspor CSV Hasil Sesi"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-400 flex-shrink-0" />
              <span className="hidden sm:inline">Laporan</span>
            </button>
            <button
              type="button"
              onClick={handleExportXLSX}
              className="flex items-center space-x-1 bg-slate-700 hover:bg-slate-600 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 transition flex-shrink-0"
              title="Ekspor XLSX Hasil Sesi"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">XLSX</span>
            </button>

            <button
              type="button"
              onClick={handleCloseRoom}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded hover:bg-rose-500/10 transition flex-shrink-0"
            >
              Akhiri
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
        {/* Left / Center: Interactive Stage */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* R2 D-01 s/d D-05: Deck PDF Presenter */}
          <DeckPresenter
            deck={deck}
            onDeckChange={setDeck}
            onLaunchActivity={handleLaunchActivityPayload}
            isQuestionActive={isQuestionActive}
            onSlideChange={handleSlideChange}
          />
          {/* Question Launcher / Ribbon (mirip toolbar ClassPoint di gambar) */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6 shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="flex items-center">
                  <Sparkles className="w-4 h-4 mr-1.5 text-brand-400" /> Pilih Tipe Interaksi Kuis
                </span>
                <button
                  type="button"
                  onClick={() => setShowPlaygroundModal(true)}
                  className="text-[11px] font-semibold text-pink-400 hover:text-pink-300 bg-pink-500/10 px-2.5 py-0.5 rounded-full border border-pink-500/30 flex items-center gap-1 transition"
                  title="Buka Plugin Playground untuk menguji atau mengunggah game baru (PL-11)"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Playground Game (Beta)</span>
                </button>
              </span>
              {isQuestionActive && (
                <span className="text-amber-400 font-semibold normal-case flex items-center gap-1 text-[11px] bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  🔒 Kuis sedang aktif (terkunci)
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
              <button
                type="button"
                disabled={isQuestionActive}
              onClick={() => setActiveTab('multiple_choice')}
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-sm transition ${
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
                disabled={isQuestionActive}
              onClick={() => setActiveTab('word_cloud')}
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-sm transition ${
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
                disabled={isQuestionActive}
              onClick={() => setActiveTab('short_answer')}
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-sm transition ${
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
                disabled={isQuestionActive}
              onClick={() => setActiveTab('slide_drawing')}
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeTab === 'slide_drawing' 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <PenTool className="w-4 h-4" />
                <span>Drawing</span>
              </button>

              <button
                type="button"
                disabled={isQuestionActive}
              onClick={() => setActiveTab('matching')}
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeTab === 'matching' 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <Link className="w-4 h-4" />
                <span>Matching</span>
              </button>

              <button
                type="button"
                disabled={isQuestionActive}
              onClick={() => setActiveTab('quick_poll')}
                className={`col-span-2 sm:col-span-1 flex items-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeTab === 'quick_poll' 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <Vote className="w-4 h-4" />
                <span>Quick Poll</span>
              </button>
                <button type="button" disabled={isQuestionActive} onClick={() => setActiveTab('ranking')} className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'ranking' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}><BarChart3 className="w-4 h-4" /><span>Ranking</span></button>
                <button type="button" disabled={isQuestionActive} onClick={() => setActiveTab('image_upload')} className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'image_upload' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}><FileImage className="w-4 h-4" /><span>Unggah Gambar</span></button>
              <button type="button" disabled={isQuestionActive} onClick={() => setActiveTab('plugin_game')} className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'plugin_game' ? 'bg-pink-600 text-white shadow-md' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'} ${isQuestionActive ? 'opacity-40 cursor-not-allowed' : ''}`}><Gamepad2 className="w-4 h-4 text-pink-400" /><span>Game Plugin (Beta)</span></button>
            </div>

            {/* Config Fields */}
            <div className="space-y-3">
              <fieldset disabled={isQuestionActive} className="space-y-3 border-0 p-0 m-0 disabled:opacity-60">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Tuliskan pertanyaan atau prompt untuk peserta..."
                className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:cursor-not-allowed"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-400 mb-1">Batas Waktu (detik)</span>
                  <input
                    type="number"
                    min="0"
                    value={timeLimitSec}
                    onChange={(e) => setTimeLimitSec(Math.max(0, parseInt(e.target.value) || 0))}
                    className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500 mt-0.5">0 = tanpa batas</span>
                </label>
                <label className="flex flex-col"><span className="text-xs font-semibold text-slate-400 mb-1">Kesulitan / Bintang</span><select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm"><option value="easy">Mudah — 1 ⭐</option><option value="medium">Sedang — 2 ⭐</option><option value="hard">Sulit — 3 ⭐</option></select></label>
              </div>

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

              {activeTab === 'ranking' && (
                <label className="block">
                  <span className="text-xs font-semibold text-slate-400">Urutan benar, satu item per baris</span>
                  <textarea rows={4} value={rankingItemsInput} onChange={(e) => setRankingItemsInput(e.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm" />
                </label>
              )}
              {activeTab === 'short_answer' && (
                <label className="block">
                  <span className="text-xs font-semibold text-slate-400">Jawaban benar, satu per baris, opsional</span>
                  <textarea rows={2} value={fillAnswersInput} onChange={(e) => setFillAnswersInput(e.target.value)} className="mt-1 w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm" placeholder="Contoh: Jakarta" />
                </label>
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

              {activeTab === 'quick_poll' && (
                <div className="space-y-3 pt-1">
                  <div className="text-xs text-slate-400 font-semibold px-1">
                    Pilih Format Polling Cepat:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(POLL_TEMPLATES) as QuickPollTemplate[]).map((tplKey) => {
                      const tpl = POLL_TEMPLATES[tplKey];
                      const isSelected = pollTemplate === tplKey;
                      return (
                        <button
                          key={tplKey}
                          type="button"
                          onClick={() => setPollTemplate(tplKey)}
                          className={`p-2.5 rounded-xl border text-left transition ${
                            isSelected
                              ? 'bg-brand-600/30 border-brand-500 text-white shadow-sm'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <p className="font-bold text-xs">{tpl.name}</p>
                          <div className="flex space-x-1 mt-1 text-sm">
                            {tpl.options.slice(0, 4).map((o) => (
                              <span key={o.id}>{o.emoji}</span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Preview of options */}
                  <div className="p-3 bg-slate-900/60 border border-slate-700/80 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Opsi Yang Akan Ditampilkan ke Peserta:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {POLL_TEMPLATES[pollTemplate].options.map((opt) => (
                        <span
                          key={opt.id}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                        >
                          <span>{opt.emoji}</span>
                          <span className="font-medium">{opt.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'plugin_game' && (
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-semibold px-1">
                    <span>Pilih Game Plugin (Beta - R5):</span>
                    <span className="text-pink-400 font-mono text-[11px] bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                      Iframe Sandbox
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BUILTIN_PLUGINS.map((p) => {
                      const isSelected = selectedPluginId === p.manifest.id;
                      return (
                        <button
                          key={p.manifest.id}
                          type="button"
                          onClick={() => setSelectedPluginId(p.manifest.id)}
                          className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-pink-950/40 border-pink-500 text-white shadow-lg ring-1 ring-pink-500/50'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <Gamepad2 className="w-4 h-4 text-pink-400 flex-shrink-0" />
                              <span className="font-bold text-sm text-white">{p.manifest.name}</span>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">{p.manifest.description}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
                            <span>Maks: {p.manifest.scoring.maxPointsPerRound} Poin</span>
                            <span>v{p.manifest.version}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center space-x-2 pt-2 px-1">
                    <input
                      type="checkbox"
                      id="pluginScoreCheck"
                      checked={pluginCountLeaderboard}
                      onChange={(e) => setPluginCountLeaderboard(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-pink-600 focus:ring-pink-500"
                    />
                    <label htmlFor="pluginScoreCheck" className="text-xs text-slate-300 font-medium">
                      Hitung skor game ini ke Live Leaderboard sesi (FR-18)
                    </label>
                  </div>
                </div>
              )}

            </fieldset>

            <div className="flex justify-end space-x-3 pt-2">
              {deck && room.currentQuestion && room.currentQuestion.status === 'closed' && (
                <button
                  type="button"
                  onClick={handleInsertResultAsSlide}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow transition text-xs sm:text-sm"
                  title="Sisipkan Hasil Kuis Sebagai Slide Baru"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sisip Hasil ke Slide</span>
                </button>
              )}

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

            {room.currentQuestion && ['short_answer', 'word_cloud', 'matching', 'slide_drawing', 'image_upload'].includes(room.currentQuestion.type) && (
              <label className="mb-4 block text-xs text-slate-300">
                Cari jawaban peserta
                <input value={answerQuery} onChange={(event) => setAnswerQuery(event.target.value)} placeholder="Kata kunci" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
              </label>
            )}

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
                        visibleAnswers.map((ans) => (
                          <button type="button"
                            key={ans.id} 
                            onClick={() => setActiveShortAnswerIndex(receivedAnswers.indexOf(ans))}
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
                              — {anonymousMode ? 'Anonim' : ans.participantName}
                            </span>
                          </button>
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
                      visibleAnswers.map((ans) => (
                        <div key={ans.id} className="bg-slate-700 border border-slate-600 rounded-xl overflow-hidden p-2 flex flex-col">
                          <img 
                            src={ans.content} 
                              alt={`Gambar dari ${anonymousMode ? 'peserta anonim' : ans.participantName}`}
                            className="w-full aspect-[4/3] object-contain bg-white rounded-lg"
                          />
                          <span className="text-xs text-slate-200 font-semibold mt-2 text-center truncate">
                            {anonymousMode ? 'Anonim' : ans.participantName}
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
                          {visibleAnswers.map((ans) => {
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
                                  <span className="font-bold text-sm text-slate-200">{anonymousMode ? 'Anonim' : ans.participantName}</span>
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

                {room.currentQuestion.type === 'ranking' && (
                  <div className="space-y-3 py-3">
                    {visibleAnswers.length === 0 ? <p className="text-center text-xs text-slate-500 py-8">Menunggu urutan peserta...</p> : visibleAnswers.map((answer) => {
                      let order: string[] = [];
                      try { order = JSON.parse(answer.content); } catch { /* server already validates score */ }
                      return <div key={answer.id} className="rounded-xl border border-slate-700 bg-slate-900/40 p-3"><p className="mb-2 text-sm font-semibold text-slate-100">{anonymousMode ? 'Anonim' : answer.participantName} <span className="text-emerald-400">+{answer.pointsAwarded ?? 0}</span></p><ol className="list-decimal pl-5 text-sm text-slate-300">{order.map((item) => <li key={item}>{item}</li>)}</ol></div>;
                    })}
                  </div>
                )}

                {room.currentQuestion.type === 'image_upload' && (
                  <div className="grid grid-cols-2 gap-3 p-2 sm:grid-cols-3">{visibleAnswers.map((answer) => <figure key={answer.id} className="rounded-xl border border-slate-600 bg-slate-700 p-2"><img src={answer.content} alt={`Unggahan dari ${anonymousMode ? 'peserta anonim' : answer.participantName}`} className="aspect-square w-full rounded-lg object-contain bg-white" /><figcaption className="mt-2 truncate text-center text-xs text-slate-200">{anonymousMode ? 'Anonim' : answer.participantName}</figcaption></figure>)}</div>
                )}

                {/* QUICK POLL RESULTS VISUALIZER (ClassPoint Style) */}
                {room.currentQuestion.type === 'quick_poll' && (
                  <div className="space-y-4 py-4 max-w-2xl mx-auto">
                    {((room.currentQuestion.options as QuickPollOptions)?.options || []).map((opt) => {
                      const count = receivedAnswers.filter(a => a.content === opt.id).length;
                      const total = receivedAnswers.length;
                      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={opt.id} className="space-y-1.5 bg-slate-900/40 border border-slate-700/80 p-3.5 rounded-2xl">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
                              <span className="font-semibold text-slate-100">{opt.label}</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-300">
                              {count} suara ({percent}%)
                            </span>
                          </div>

                          <div className="w-full bg-slate-800 h-5 rounded-full overflow-hidden p-0.5">
                            <div
                              className="h-full rounded-full transition-all duration-500 shadow-sm"
                              style={{ 
                                width: `${percent}%`,
                                backgroundColor: opt.color || '#6366f1'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* R5 PLUGIN GAME SANDBOX VIEW */}
                {room.currentQuestion.type === 'plugin_game' && room.currentQuestion.pluginConfig && (
                  <div className="w-full flex-1 flex flex-col min-h-[500px] my-2">
                    <PluginSandbox
                      role="presenter"
                      code={room.code}
                      hostToken={hostToken}
                      manifest={room.currentQuestion.pluginConfig.manifest}
                      config={room.currentQuestion.pluginConfig.config}
                      html={room.currentQuestion.pluginConfig.html || ''}
                      participantCount={participantList.filter(p => p.connected).length}
                      onClose={handleCloseQuestion}
                    />
                  </div>
                )}

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
                    <span>{room.currentQuestion?.timeLimitSec ? formatTime(getTimeRemaining() ?? 0) : formatTime(timerSeconds)}</span>
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
                    onClick={() => setAnonymousMode(prev => !prev)}
                    className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${anonymousMode ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                    title="Sembunyikan nama peserta pada hasil presenter"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{anonymousMode ? 'Anonim' : 'Nama'}</span>
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

        <section className="w-full md:w-80 bg-slate-800/90 border-t md:border-t-0 md:border-l border-slate-700 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-brand-400" /> Live Q&amp;A</h3>
            <label className="flex items-center gap-1 text-[11px] text-slate-300">
              <input type="checkbox" checked={room.qnaEnabled} onChange={(e) => socket.emit('set-qna-enabled', { code: room.code, hostToken, enabled: e.target.checked })} /> Aktif
            </label>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-80">
            {qnaItems.length === 0 ? <p className="text-xs text-slate-500">Belum ada pertanyaan.</p> : [...qnaItems].sort((a, b) => b.upvotes - a.upvotes || a.createdAt - b.createdAt).map((item) => (
              <div key={item.id} className={`rounded-lg border p-2.5 ${item.status === 'answered' ? 'border-emerald-500/30 bg-emerald-950/20' : item.status === 'ignored' ? 'border-slate-600 bg-slate-900/20 opacity-70' : 'border-slate-700 bg-slate-900/40'}`}>
                <p className="text-xs text-slate-100 break-words">{item.content}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="truncate">{item.participantName} · ▲ {item.upvotes}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => socket.emit('mark-qna', { code: room.code, hostToken, qnaId: item.id, status: item.status === 'answered' ? 'open' : 'answered' })} className="rounded bg-emerald-600 px-1.5 py-1 font-semibold text-white">{item.status === 'answered' ? 'Buka' : 'Jawab'}</button>
                    <button type="button" onClick={() => socket.emit('mark-qna', { code: room.code, hostToken, qnaId: item.id, status: item.status === 'ignored' ? 'open' : 'ignored' })} className="rounded bg-slate-700 px-1.5 py-1 font-semibold text-slate-200">Abaikan</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Sidebar: Connected Participants & R2 P-07 Live Submission Status */}
        <aside className="w-full md:w-72 bg-slate-800/90 border-t md:border-t-0 md:border-l border-slate-700 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <Users className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Daftar Hadir ({participantList.length})
            </h3>
            {isQuestionActive && (
              <span className="text-[11px] font-mono font-bold text-brand-300 bg-brand-900/60 border border-brand-500/30 px-2 py-0.5 rounded-full">
                {receivedAnswers.length}/{participantList.length} Jawab
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {participantList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Belum ada peserta yang bergabung. Bagikan PIN atau QR Code!
              </p>
            ) : (
              participantList.map((p) => {
                const answer = receivedAnswers.find(a => a.participantId === p.id);
                const hasSubmitted = !!answer;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition border ${
                      isQuestionActive && hasSubmitted
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                        : isQuestionActive && !hasSubmitted
                        ? 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                        : 'bg-slate-700/50 border-transparent text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.connected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      <span className="font-semibold truncate">{p.name}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                      {isQuestionActive && (
                        hasSubmitted ? (
                          <span className="inline-flex items-center text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded" title="Sudah mengirimkan jawaban">
                            <CheckCircle className="w-3 h-3 mr-0.5" /> Jawab
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded" title="Menunggu jawaban...">
                            <HelpCircle className="w-3 h-3 mr-0.5 text-slate-500" /> Tunggu
                          </span>
                        )
                      )}

                      {p.score > 0 && (
                        <span className="text-amber-400 font-mono font-bold flex items-center text-[11px]">
                          <Trophy className="w-3 h-3 mr-0.5" /> {p.score}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* QR Code Big Screen Modal */}
      {showQRModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowQRModal(false)}
        >
          <div 
            className="bg-white text-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-sm sm:max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in duration-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl sm:text-2xl font-black mb-1">Bergabung ke InixPoint</h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">Scan QR code atau buka link dan masukkan PIN:</p>
            
            <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 inline-flex items-center justify-center mb-4 sm:mb-6 shadow-inner max-w-full">
              <QRCodeSVG 
                value={joinUrl} 
                size={200}
                className="w-44 h-44 sm:w-52 sm:h-52 max-w-full aspect-square" 
              />
            </div>

            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
              <span className="text-[11px] sm:text-xs text-brand-600 uppercase font-bold tracking-wider block">Kode PIN Ruangan</span>
              <span className="text-3xl sm:text-5xl font-mono font-black text-brand-700 tracking-widest">{room.code}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 sm:py-3 rounded-xl transition text-sm sm:text-base"
            >
              Tutup Layar PIN
            </button>
          </div>
        </div>
      )}

      {/* R2 P-11: Random Name Picker Modal */}
      {showPickerModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => !isPicking && setShowPickerModal(false)}
        >
          <div
            className="bg-slate-800 border border-slate-700 text-white rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-bold flex items-center text-amber-400">
                <Dice5 className="w-5 h-5 mr-2" /> Random Name Picker
              </h3>
              {!isPicking && (
                <button
                  type="button"
                  onClick={() => setShowPickerModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-6">
              Pilih peserta secara acak dari total <strong className="text-white">{participantList.filter(p => p.connected).length} peserta aktif</strong>.
            </p>

            {/* Display Box */}
            <div className="bg-slate-900 border-2 border-brand-500/50 rounded-2xl py-10 px-4 mb-6 shadow-inner flex flex-col items-center justify-center min-h-[140px]">
              {pickedName ? (
                <div className="animate-in zoom-in-90 duration-150">
                  <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wide font-sans block mb-1">
                    🎉 {pickedName}
                  </span>
                  {!isPicking && (
                    <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                      Terpilih!
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-slate-500 font-medium">
                  Tekan tombol di bawah untuk mengacak
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPicking || participantList.filter(p => p.connected).length === 0}
                onClick={handlePickRandomName}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl shadow transition flex items-center justify-center space-x-2 text-sm"
              >
                <Dice5 className="w-4 h-4" />
                <span>{isPicking ? 'Sedang Mengacak...' : 'Putar / Acak Nama'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* R2 P-12: Free Timer / Stopwatch Modal */}
      {showTimerModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setShowTimerModal(false)}
        >
          <div
            className="bg-slate-800 border border-slate-700 text-white rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-bold flex items-center text-sky-400">
                <Timer className="w-5 h-5 mr-2" /> Timer & Stopwatch Kelas
              </h3>
              <button
                type="button"
                onClick={() => setShowTimerModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setFreeTimerMode('countdown');
                  setFreeTimerRunning(false);
                  setFreeTimerSeconds(freeTimerInput * 60);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  freeTimerMode === 'countdown' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Countdown Timer
              </button>
              <button
                type="button"
                onClick={() => {
                  setFreeTimerMode('stopwatch');
                  setFreeTimerRunning(false);
                  setFreeTimerSeconds(0);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  freeTimerMode === 'stopwatch' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Stopwatch
              </button>
            </div>

            {/* Timer Large Display */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl py-8 px-4 mb-6 shadow-inner">
              <span className="text-5xl sm:text-6xl font-mono font-black text-sky-400 tracking-wider">
                {formatTime(freeTimerSeconds)}
              </span>
            </div>

            {/* Quick Preset Buttons for Countdown */}
            {freeTimerMode === 'countdown' && !freeTimerRunning && (
              <div className="flex justify-center gap-2 mb-6">
                {[1, 3, 5, 10].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setFreeTimerInput(mins);
                      setFreeTimerSeconds(mins * 60);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                      freeTimerInput === mins
                        ? 'bg-sky-600/30 border-sky-400 text-sky-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFreeTimerRunning(r => !r)}
                className={`flex-1 font-bold py-3 rounded-xl shadow transition text-sm flex items-center justify-center space-x-2 ${
                  freeTimerRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                {freeTimerRunning ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{freeTimerRunning ? 'Jeda (Pause)' : 'Mulai (Start)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFreeTimerRunning(false);
                  setFreeTimerSeconds(freeTimerMode === 'countdown' ? freeTimerInput * 60 : 0);
                }}
                className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl transition flex items-center justify-center"
                title="Reset Waktu"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
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
                  {anonymousMode ? 'Anonim' : receivedAnswers[activeShortAnswerIndex].participantName}
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
      {showSessionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="session-summary-title" className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900">
            <h2 id="session-summary-title" className="text-xl font-bold">Ringkasan sesi</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Peserta</dt><dd className="font-bold">{participantList.length}</dd></div><div><dt className="text-slate-500">Aktivitas</dt><dd className="font-bold">{room.questions.length}</dd></div><div><dt className="text-slate-500">Respons terakhir</dt><dd className="font-bold">{receivedAnswers.length}</dd></div><div><dt className="text-slate-500">Skor tertinggi</dt><dd className="font-bold">{Math.max(0, ...participantList.map((participant) => participant.score))}</dd></div></dl>
            <div className="mt-6 flex gap-3"><button type="button" onClick={handleExportXLSX} className="btn-primary flex-1">Ekspor XLSX</button><button type="button" onClick={onExit} className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold">Selesai</button></div>
          </div>
        </div>
      )}
      {/* R2 P-13: Annotation & Whiteboard Canvas Overlay */}
      <AnnotationToolkit
        isOpen={isAnnotationOpen}
        onClose={() => setIsAnnotationOpen(false)}
        isWhiteboard={isWhiteboardActive}
        onToggleWhiteboard={() => setIsWhiteboardActive(prev => !prev)}
      />

      {/* R5 PL-11: Plugin Playground Modal */}
      <PluginPlayground
        isOpen={showPlaygroundModal}
        onClose={() => setShowPlaygroundModal(false)}
        onSelectPluginForClass={(plugin) => {
          setSelectedPluginId(plugin.manifest.id);
          setActiveTab('plugin_game');
          setShowPlaygroundModal(false);
        }}
      />
    </div>
  );
};
