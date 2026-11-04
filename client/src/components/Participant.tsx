import React, { useState, useEffect } from 'react';
import { socket } from '../lib/socket';
import { Room, Question, Answer } from '@inixpoint/shared';
import { DrawingCanvas } from './DrawingCanvas';
import { MatchingQuestion } from './MatchingQuestion';
import { CheckCircle2, Clock, Send, Sparkles } from 'lucide-react';

interface ParticipantProps {
  room: Room;
  participantName: string;
  onLeave: () => void;
}

export const Participant: React.FC<ParticipantProps> = ({ room: initialRoom, participantName, onLeave }) => {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [currentQuestion, setCurrentQuestion] = useState<Question | undefined>(initialRoom.currentQuestion);
  const [answerInput, setAnswerInput] = useState<string>('');
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    socket.on('question-started', (q: Question) => {
      setCurrentQuestion(q);
      setAnswerInput('');
      setSubmittedAnswer(null);
      setStatusMessage('');
    });

    socket.on('question-closed', () => {
      setCurrentQuestion((prev) => prev ? { ...prev, status: 'closed' } : undefined);
      setStatusMessage('Pertanyaan telah ditutup oleh presenter.');
    });

    socket.on('room-closed', () => {
      alert('Sesi ini telah diakhiri oleh presenter.');
      onLeave();
    });

    return () => {
      socket.off('question-started');
      socket.off('question-closed');
      socket.off('room-closed');
    };
  }, [onLeave]);

  const handleSubmit = (content: string) => {
    if (!currentQuestion || !content.trim()) return;

    setIsSubmitting(true);
    socket.emit('submit-answer', {
      code: room.code,
      questionId: currentQuestion.id,
      content: content.trim()
    }, (res) => {
      setIsSubmitting(false);
      if (res.success) {
        setSubmittedAnswer(content);
        setStatusMessage('Jawaban Anda berhasil dikirim!');
      } else {
        alert(res.error || 'Gagal mengirim jawaban.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center font-serif font-bold text-white text-sm">
            IP
          </div>
          <div>
            <h1 className="font-serif font-bold text-sm leading-tight text-neutral-900">InixPoint</h1>
            <p className="text-xs text-neutral-500">PIN: <span className="font-mono font-bold text-primary-600">{room.code}</span></p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-xs font-semibold text-neutral-700 block">{participantName}</span>
            <span className="text-xs text-success flex items-center justify-end space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              <span>Terhubung</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 flex flex-col items-center justify-center">
        {!currentQuestion || currentQuestion.status !== 'active' ? (
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Clock className="w-10 h-10" />
            </div>
            <h2 className="font-serif font-bold text-2xl text-neutral-900 mb-2">Menunggu Pertanyaan</h2>
            <p className="text-neutral-600 text-sm mb-6">
              Presenter sedang menyiapkan materi. Tetap di halaman ini!
            </p>
            {statusMessage && (
              <div className="p-3 bg-secondary-50 border border-secondary-200 text-secondary-700 rounded-lg text-sm">
                {statusMessage}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            {/* Question Card */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
                  {currentQuestion.type.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-neutral-500 flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
                  <span>Live</span>
                </span>
              </div>
              <h3 className="font-serif font-bold text-2xl text-neutral-900">{currentQuestion.prompt}</h3>
            </div>

            {/* Answer Controls */}
            {currentQuestion.type === 'multiple_choice' && (
              <div className="space-y-3">
                {currentQuestion.options?.choices.map((choice, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = submittedAnswer === String(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSubmit(String(idx))}
                      className={`w-full flex items-center p-4 rounded-lg border-2 font-semibold text-left transition ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50 text-primary-900 shadow-md'
                          : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50 text-neutral-900'
                      }`}
                    >
                      <span className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 font-serif font-bold text-sm ${
                        isSelected ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {letter}
                      </span>
                      <span className="flex-1">{choice}</span>
                      {isSelected && <CheckCircle2 className="w-6 h-6 text-primary-600" />}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'word_cloud' && (
              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={30}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Ketik 1-2 kata..."
                  className="input-base w-full text-lg"
                />
                <button
                  type="button"
                  disabled={!answerInput.trim() || isSubmitting}
                  onClick={() => handleSubmit(answerInput)}
                  className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittedAnswer ? 'Perbarui' : 'Kirim'}</span>
                </button>
              </div>
            )}

            {currentQuestion.type === 'short_answer' && (
              <div className="space-y-4">
                <textarea
                  rows={5}
                  maxLength={300}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Tulis jawaban Anda di sini..."
                  className="input-base w-full"
                />
                <button
                  type="button"
                  disabled={!answerInput.trim() || isSubmitting}
                  onClick={() => handleSubmit(answerInput)}
                  className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Jawaban</span>
                </button>
              </div>
            )}

            {currentQuestion.type === 'slide_drawing' && (
              <div className="space-y-4">
                <DrawingCanvas onSave={(dataUrl) => setAnswerInput(dataUrl)} />
                <button
                  type="button"
                  disabled={!answerInput || isSubmitting}
                  onClick={() => handleSubmit(answerInput)}
                  className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Gambar</span>
                </button>
              </div>
            )}

            {currentQuestion.type === 'matching' && (
              <MatchingQuestion
                pairs={currentQuestion.options?.pairs || []}
                onSubmit={(matches) => handleSubmit(JSON.stringify(matches))}
                submitted={!!submittedAnswer}
                isSubmitting={isSubmitting}
              />
            )}

            {submittedAnswer && (
              <div className="mt-6 p-4 bg-success/10 border border-success/30 text-success rounded-lg text-sm flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Jawaban berhasil dikirim!</p>
                  <p className="text-xs opacity-75 mt-1">Presenter akan menutup pertanyaan segera.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white px-4 py-3 text-center">
        <button
          type="button"
          onClick={onLeave}
          className="text-xs text-neutral-500 hover:text-neutral-700 font-medium underline"
        >
          Keluar dari Sesi
        </button>
      </footer>
    </div>
  );
};
