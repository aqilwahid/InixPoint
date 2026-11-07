import React, { useRef, useState, useEffect } from 'react';
import { Deck, DeckSlide, Question, QuestionType, BUILTIN_PLUGINS } from '@inixpoint/shared';
import { renderPdfToImages } from '../lib/pdfRenderer';
import { 
  FileUp, 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Minimize, 
  PlusCircle, 
  Sparkles, 
  Play, 
  Trash2, 
  X,
  FileText
} from 'lucide-react';

interface DeckPresenterProps {
  deck: Deck | null;
  onDeckChange: (deck: Deck | null) => void;
  onLaunchActivity: (questionPayload: Omit<Question, 'id' | 'status' | 'createdAt'>) => void;
  isQuestionActive: boolean;
  onSlideChange?: (slide: DeckSlide) => void;
}

export const DeckPresenter: React.FC<DeckPresenterProps> = ({
  deck,
  onDeckChange,
  onLaunchActivity,
  isQuestionActive,
  onSlideChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertSlideType, setInsertSlideType] = useState<QuestionType>('multiple_choice');
  const [insertPrompt, setInsertPrompt] = useState('');
  const [insertAutoStart, setInsertAutoStart] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentSlide = deck && deck.slides[deck.currentSlideIndex];

  // Keyboard navigation: ArrowLeft / ArrowRight / Space / F (fullscreen)
  useEffect(() => {
    if (!deck) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deck]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Format berkas tidak didukung. Harap unggah materi dalam format PDF.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Ukuran file PDF melebihi batas 50 MB.');
      return;
    }

    try {
      setIsUploading(true);
      setRenderProgress({ current: 0, total: 1 });

      const renderedPages = await renderPdfToImages(file, 100, (current, total) => {
        setRenderProgress({ current, total });
      });

      const slides: DeckSlide[] = renderedPages.map((page) => ({
        id: `pdf_p${page.pageNumber}_${Date.now()}`,
        type: 'pdf_page',
        title: `Halaman ${page.pageNumber}`,
        pageNumber: page.pageNumber,
        imageUrl: page.dataUrl,
      }));

      const newDeck: Deck = {
        id: `deck_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        pageCount: slides.length,
        slides,
        currentSlideIndex: 0,
      };

      onDeckChange(newDeck);
      if (onSlideChange && slides[0]) {
        onSlideChange(slides[0]);
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses berkas PDF: ' + (err.message || 'Format tidak valid atau terenkripsi'));
    } finally {
      setIsUploading(false);
      setRenderProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleNextSlide = () => {
    if (!deck || deck.currentSlideIndex >= deck.slides.length - 1) return;
    const nextIdx = deck.currentSlideIndex + 1;
    const nextSlide = deck.slides[nextIdx];

    onDeckChange({
      ...deck,
      currentSlideIndex: nextIdx,
    });

    // D-04: Auto-start activity when landing on activity slide
    if (nextSlide.type === 'activity' && nextSlide.activityConfig && nextSlide.autoStart && !isQuestionActive) {
      onLaunchActivity(nextSlide.activityConfig);
    }
  };

  const handlePrevSlide = () => {
    if (!deck || deck.currentSlideIndex <= 0) return;
    const prevIdx = deck.currentSlideIndex - 1;
    onDeckChange({
      ...deck,
      currentSlideIndex: prevIdx,
    });
  };

  const handleInsertActivitySlide = () => {
    if (!deck || !insertPrompt.trim()) return;

    const samplePlugin = BUILTIN_PLUGINS[0];
    const newSlide: DeckSlide = {
      id: `act_${Date.now()}`,
      type: 'activity',
      title: `Aktivitas: ${insertPrompt.trim()}`,
      autoStart: insertAutoStart,
      activityConfig: {
        type: insertSlideType,
        prompt: insertPrompt.trim(),
        options: insertSlideType === 'multiple_choice' ? {
          choices: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D']
        } : undefined,
        pluginConfig: insertSlideType === 'plugin_game' ? {
          pluginId: samplePlugin.manifest.id,
          manifest: samplePlugin.manifest,
          config: { rounds: 3 },
          countTowardsLeaderboard: true,
          html: samplePlugin.html
        } : undefined
      }
    };

    const nextSlides = [...deck.slides];
    // Insert immediately after current slide
    nextSlides.splice(deck.currentSlideIndex + 1, 0, newSlide);

    onDeckChange({
      ...deck,
      slides: nextSlides,
      pageCount: nextSlides.length,
      currentSlideIndex: deck.currentSlideIndex + 1,
    });

    setShowInsertModal(false);
    setInsertPrompt('');

    if (insertAutoStart && !isQuestionActive && newSlide.activityConfig) {
      onLaunchActivity(newSlide.activityConfig);
    }
  };

  const handleDeleteCurrentSlide = () => {
    if (!deck || deck.slides.length <= 1) return;
    const nextSlides = deck.slides.filter((_, idx) => idx !== deck.currentSlideIndex);
    const nextIndex = Math.min(deck.currentSlideIndex, nextSlides.length - 1);
    onDeckChange({
      ...deck,
      slides: nextSlides,
      pageCount: nextSlides.length,
      currentSlideIndex: nextIndex,
    });
  };

  // If no deck uploaded yet
  if (!deck) {
    return (
      <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center my-4 shadow-lg">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/40 text-brand-400 flex items-center justify-center mb-4 shadow-inner">
          <FileUp className="w-8 h-8" />
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
          {isUploading ? 'Merender Halaman PDF...' : 'Materi Presentasi (Deck PDF)'}
        </h3>

        {isUploading ? (
          <div className="w-full max-w-xs space-y-2 mt-2">
            <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-brand-500 h-full transition-all duration-200"
                style={{ 
                  width: renderProgress ? `${Math.round((renderProgress.current / renderProgress.total) * 100)}%` : '20%' 
                }}
              />
            </div>
            <p className="text-xs text-brand-300 font-mono">
              Memproses {renderProgress?.current || 0} dari {renderProgress?.total || 1} halaman...
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              Unggah file PDF slide materi kelas Anda (maks. 50 MB / 100 halaman). Anda dapat memandu slide dan menyisipkan kuis interaktif di antara halaman.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition flex items-center space-x-2 text-sm"
            >
              <FileUp className="w-4 h-4" />
              <span>Pilih Berkas PDF Materi</span>
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full my-4 min-h-[480px]'
      }`}
    >
      {/* Top Deck Info Bar */}
      <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center space-x-2 truncate">
          <FileText className="w-4 h-4 text-brand-400 flex-shrink-0" />
          <span className="font-bold text-white truncate max-w-xs sm:max-w-md">{deck.title}</span>
          <span className="text-[11px] bg-slate-700 px-2 py-0.5 rounded-full font-mono">
            Slide {deck.currentSlideIndex + 1} / {deck.slides.length}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Insert Activity Button */}
          <button
            type="button"
            onClick={() => setShowInsertModal(true)}
            className="flex items-center space-x-1 bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1 rounded-lg font-bold text-xs transition"
            title="Sisipkan Slide Aktivitas/Kuis (D-03)"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sisip Kuis</span>
          </button>

          {/* Delete Slide Button */}
          {deck.slides.length > 1 && (
            <button
              type="button"
              onClick={handleDeleteCurrentSlide}
              className="p-1.5 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 rounded-lg transition"
              title="Hapus Slide Ini"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            title={isFullscreen ? 'Keluar Fullscreen (Esc/F)' : 'Layar Penuh (F)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Slide Stage View */}
      <div className="flex-1 flex items-center justify-center bg-black/60 relative p-4 min-h-[380px] overflow-hidden select-none">
        {currentSlide && (
          currentSlide.type === 'pdf_page' && currentSlide.imageUrl ? (
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          ) : currentSlide.type === 'activity' ? (
            <div className="bg-gradient-to-br from-brand-950 via-slate-900 to-slate-950 border border-brand-500/40 rounded-3xl p-8 max-w-xl w-full text-center shadow-2xl animate-in zoom-in-95">
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Slide Aktivitas Interaktif</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 leading-tight">
                {currentSlide.activityConfig?.prompt || currentSlide.title}
              </h2>
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={isQuestionActive}
                  onClick={() => currentSlide.activityConfig && onLaunchActivity(currentSlide.activityConfig)}
                  className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-black px-6 py-3 rounded-2xl shadow-xl transition flex items-center space-x-2 text-sm sm:text-base"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isQuestionActive ? 'Kuis Sedang Aktif' : 'Mulai Aktivitas Ini Sekarang'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center">
              <h3 className="text-xl font-bold text-white mb-2">{currentSlide.title}</h3>
              <p className="text-xs text-slate-400">Hasil sesi interaktif yang telah disisipkan ke dalam slide deck.</p>
            </div>
          )
        )}

        {/* Hover Slide Nav Buttons */}
        <button
          type="button"
          disabled={deck.currentSlideIndex <= 0}
          onClick={handlePrevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 disabled:opacity-0 text-white flex items-center justify-center transition border border-slate-700 shadow-xl"
          title="Slide Sebelumnya (Arrow Left)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          type="button"
          disabled={deck.currentSlideIndex >= deck.slides.length - 1}
          onClick={handleNextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 disabled:opacity-0 text-white flex items-center justify-center transition border border-slate-700 shadow-xl"
          title="Slide Selanjutnya (Arrow Right / Space)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Slide Thumbnails Tray (Dock) */}
      <div className="bg-slate-800/90 border-t border-slate-700 p-2.5 flex items-center space-x-2 overflow-x-auto">
        {deck.slides.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onDeckChange({ ...deck, currentSlideIndex: idx })}
            className={`flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition ${
              deck.currentSlideIndex === idx
                ? 'border-brand-500 ring-2 ring-brand-500/40 scale-105'
                : 'border-slate-700 hover:border-slate-500 opacity-60 hover:opacity-100'
            }`}
          >
            {s.type === 'pdf_page' && s.imageUrl ? (
              <img src={s.imageUrl} alt={s.title} className="w-16 h-10 sm:w-20 sm:h-12 object-cover" />
            ) : (
              <div className="w-16 h-10 sm:w-20 sm:h-12 bg-brand-900/80 flex items-center justify-center text-[10px] font-bold text-brand-200 p-1 text-center">
                {s.type === 'activity' ? '⚡ Kuis' : '📊 Hasil'}
              </div>
            )}
            <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold bg-black/70 text-white px-1 rounded">
              {idx + 1}
            </span>
          </button>
        ))}
      </div>

      {/* Insert Activity Modal */}
      {showInsertModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setShowInsertModal(false)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center text-brand-300">
                <PlusCircle className="w-4 h-4 mr-2" /> Sisipkan Slide Aktivitas (D-03)
              </h3>
              <button
                type="button"
                onClick={() => setShowInsertModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Tipe Aktivitas
                </label>
                <select
                  value={insertSlideType}
                  onChange={(e) => setInsertSlideType(e.target.value as QuestionType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="word_cloud">Word Cloud</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="slide_drawing">Drawing</option>
                  <option value="quick_poll">Quick Poll</option>
                  <option value="plugin_game">Game Plugin (Beta)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Pertanyaan / Instruksi
                </label>
                <textarea
                  value={insertPrompt}
                  onChange={(e) => setInsertPrompt(e.target.value)}
                  placeholder="Contoh: Apa kesimpulan dari bab ini?"
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoStartCheck"
                  checked={insertAutoStart}
                  onChange={(e) => setInsertAutoStart(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="autoStartCheck" className="text-xs text-slate-300 font-medium">
                  Mulai otomatis saat slide ini dibuka (D-04 Auto-start)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInsertModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl transition text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!insertPrompt.trim()}
                  onClick={handleInsertActivitySlide}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-xs shadow"
                >
                  Sisipkan Slide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
