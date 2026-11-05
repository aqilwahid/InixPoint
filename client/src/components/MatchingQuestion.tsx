import React, { useState } from 'react';
import { MatchingPair } from '@inixpoint/shared';
import { Send, CheckCircle2, Link2 } from 'lucide-react';

interface MatchingQuestionProps {
  pairs: MatchingPair[];
  onSubmit: (matches: Record<string, string>) => void;
  submitted?: boolean;
  isSubmitting?: boolean;
}

export const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
  pairs,
  onSubmit,
  submitted = false,
  isSubmitting = false
}) => {
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const handleSelectLeft = (leftId: string) => {
    if (submitted || isSubmitting) return;
    setSelectedLeft(prev => prev === leftId ? null : leftId);
  };

  const handleMatchRight = (rightValue: string) => {
    if (submitted || isSubmitting) return;
    let targetLeftId = selectedLeft;
    if (!targetLeftId) {
      const unmatched = pairs.find(p => !matches[p.id]);
      if (unmatched) targetLeftId = unmatched.id;
    }
    if (!targetLeftId) return;

    setMatches(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (next[key] === rightValue) {
          delete next[key];
        }
      }
      next[targetLeftId] = rightValue;
      return next;
    });

    const remaining = pairs.find(p => p.id !== targetLeftId && !matches[p.id]);
    setSelectedLeft(remaining ? remaining.id : null);
  };

  const handleUnmatch = (leftId: string) => {
    if (submitted || isSubmitting) return;
    setMatches(prev => {
      const next = { ...prev };
      delete next[leftId];
      return next;
    });
    setSelectedLeft(leftId);
  };

  const handleSubmit = () => {
    onSubmit(matches);
  };

  const allMatched = pairs.length > 0 && Object.keys(matches).length === pairs.length;
  const usedRights = new Set(Object.values(matches));

  return (
    <div className="space-y-4">
      <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800 flex items-center space-x-2">
        <Link2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
        <span>Pilih item di kolom kiri, lalu klik pasangannya di kolom kanan.</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Left column - Items to match */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Item</p>
          <div className="space-y-2">
            {pairs.map((pair) => {
              const isMatched = !!matches[pair.id];
              const isSelected = selectedLeft === pair.id;
              return (
                <div
                  key={pair.id}
                  onClick={() => handleSelectLeft(pair.id)}
                  className={`p-3 rounded-xl border-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-300'
                      : isMatched
                      ? 'border-brand-300 bg-brand-50/60'
                      : 'border-neutral-200 bg-white hover:border-brand-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-neutral-900">{pair.left}</p>
                  {isMatched && (
                    <div className="flex items-center justify-between text-xs text-brand-700 mt-1.5 pt-1.5 border-t border-brand-200">
                      <span className="truncate">→ {matches[pair.id]}</span>
                      {!submitted && !isSubmitting && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnmatch(pair.id);
                          }}
                          className="text-rose-500 hover:text-rose-700 font-bold ml-1"
                          title="Hapus pasangan"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column - Available options */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Pasangan</p>
          <div className="space-y-2">
            {pairs.map((pair) => {
              const isUsed = usedRights.has(pair.right);
              return (
                <button
                  key={`opt-${pair.id}`}
                  type="button"
                  disabled={submitted || isSubmitting}
                  onClick={() => handleMatchRight(pair.right)}
                  className={`w-full p-3 rounded-xl border-2 text-left text-sm font-semibold transition ${
                    isUsed
                      ? 'border-neutral-200 bg-neutral-100 text-neutral-400'
                      : 'border-neutral-200 bg-white text-neutral-900 hover:border-brand-400 hover:bg-brand-50/40 shadow-sm'
                  }`}
                >
                  {pair.right}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Matched pairs status */}
      <div className="flex justify-between items-center text-xs text-neutral-600 px-1">
        <span>Terpasang: <strong className="text-brand-600">{Object.keys(matches).length}</strong> dari {pairs.length}</span>
        {allMatched && !submitted && <span className="text-emerald-600 font-bold">Semua pasangan lengkap ✓</span>}
      </div>

      {/* Submit button */}
      <button
        type="button"
        disabled={!allMatched || submitted || isSubmitting}
        onClick={handleSubmit}
        className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
      >
        {submitted ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Jawaban Terkirim</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>{allMatched ? 'Kirim Jawaban' : `Lengkapi Pasangan (${Object.keys(matches).length}/${pairs.length})`}</span>
          </>
        )}
      </button>
    </div>
  );
};
