import React, { useState, useEffect } from 'react';
import { socket } from '../lib/socket';
import { Room, Question, Answer } from '@inixpoint/shared';
import { DrawingCanvas } from './DrawingCanvas';
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
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between max-w-lg mx-auto shadow-md">
      {/* Header */}
      <header className="bg-brand-600 text-white px-4 py-3 flex items-center justify-between shadow">
        <div>
          <h1 className="font-bold text-lg leading-tight">InixPoint</h1>
          <p className="text-xs text-brand-100">PIN: <span className="font-mono font-bold tracking-wider">{room.code}</span></p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <span className="text-sm font-semibold block leading-tight">{participantName}</span>
            <span className="text-xs text-emerald-200 flex items-center justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1"></span> Terhubung
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 flex-1 flex flex-col justify-center">
        {!currentQuestion || currentQuestion.status !== 'active' ? (
          <div className="text-center py-12 px-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Menunggu Kuis</h2>
            <p className="text-slate-500 text-sm">
              Presenter sedang menyiapkan materi atau pertanyaan kuis berikutnya. Tetap di halaman ini ya!
            </p>
            {statusMessage && (
              <p className="mt-4 p-2 text-xs bg-amber-50 text-amber-700 rounded border border-amber-200">
                {statusMessage}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                {currentQuestion.type.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-400 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" /> Live
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-4">{currentQuestion.prompt}</h3>

            {/* Answer Controls by Type */}
            {currentQuestion.type === 'multiple_choice' && (
              <div className="space-y-2.5">
                {currentQuestion.options?.choices.map((choice, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = submittedAnswer === String(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSubmit(String(idx))}
                      className={`w-full flex items-center p-3.5 rounded-xl border-2 font-medium text-left transition ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm'
                          : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 font-bold text-sm ${
                        isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {letter}
                      </span>
                      <span className="flex-1">{choice}</span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-600 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'word_cloud' && (
              <div className="space-y-3">
                <input
                  type="text"
                  maxLength={30}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Ketik 1-2 kata..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-base"
                />
                <button
                  type="button"
                  disabled={!answerInput.trim() || isSubmitting}
                  onClick={() => handleSubmit(answerInput)}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittedAnswer ? 'Perbarui Kata' : 'Kirim Kata'}</span>
                </button>
              </div>
            )}

            {currentQuestion.type === 'short_answer' && (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  maxLength={300}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Ketik penjelasan jawaban Anda di sini..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-base"
                />
                <button
                  type="button"
                  disabled={!answerInput.trim() || isSubmitting}
                  onClick={() => handleSubmit(answerInput)}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittedAnswer ? 'Kirim Revisi' : 'Kirim Jawaban'}</span>
                </button>
              </div>
            )}

            {currentQuestion.type === 'slide_drawing' && (
              <div className="space-y-3">
                <DrawingCanvas onSave={(dataUrl) => setAnswerInput(dataUrl)} />
                <button
                  type="button"
                  disabled={!answerInput || isSubmitting}
                  onClick={() => handleSubmit(answerInput)}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittedAnswer ? 'Kirim Ulang Gambar' : 'Kirim Gambar'}</span>
                </button>
              </div>
            )}

            {submittedAnswer && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Jawaban Anda telah tersimpan di server presenter.</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <button
          type="button"
          onClick={onLeave}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          Keluar dari Sesi
        </button>
      </footer>
    </div>
  );
};
