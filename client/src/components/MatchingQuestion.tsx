import React, { useState } from 'react';
import { MatchingPair } from '@inixpoint/shared';
import { Send, CheckCircle2 } from 'lucide-react';

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

  const unmatched = pairs.filter(p => !matches[p.id]);
  const handleMatch = (leftId: string, rightId: string) => {
    setMatches(prev => ({
      ...prev,
      [leftId]: rightId
    }));
  };

  const handleUnmatch = (leftId: string) => {
    setMatches(prev => {
      const next = { ...prev };
      delete next[leftId];
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit(matches);
  };

  const allMatched = Object.keys(matches).length === pairs.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Left column - Items to match */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-600 uppercase">Pilih pasangan</p>
          <div className="space-y-2">
            {pairs.map(pair => (
              <div
                key={pair.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                  matches[pair.id]
                    ? 'bg-primary-50 border-primary-400'
                    : 'bg-neutral-50 border-neutral-200 hover:border-primary-300'
                }`}
              >
                <p className="text-sm font-medium text-neutral-900">{pair.left}</p>
                {matches[pair.id] && (
                  <p className="text-xs text-primary-700 mt-1">→ {pair.right}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right column - Available options */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-600 uppercase">Opsi pasangan</p>
          <div className="space-y-2">
            {pairs.map(pair => (
              <button
                key={`opt-${pair.id}`}
                type="button"
                disabled={submitted || isSubmitting}
                onClick={() => {
                  // Find unmatched left item and match it
                  const leftId = pairs.find(
                    p => !matches[p.id] || matches[p.id] === pair.right
                  )?.id;
                  if (leftId) {
                    handleMatch(leftId, pair.right);
                  }
                }}
                className="w-full p-3 rounded-lg border-2 border-neutral-200 hover:border-primary-300 text-left transition disabled:opacity-50 bg-white hover:bg-neutral-50"
              >
                <p className="text-sm font-medium text-neutral-900">{pair.right}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Matched pairs preview */}
      {Object.keys(matches).length > 0 && (
        <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <p className="text-xs font-semibold text-primary-900 mb-2">Pasangan Anda ({Object.keys(matches).length}/{pairs.length})</p>
          <div className="space-y-1">
            {pairs
              .filter(p => matches[p.id])
              .map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs text-primary-800">
                  <span>{p.left} → {matches[p.id]}</span>
                  <button
                    type="button"
                    onClick={() => handleUnmatch(p.id)}
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

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
            <span>Sudah terkirim</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>{allMatched ? 'Kirim Jawaban' : `Lengkapi pasangan (${Object.keys(matches).length}/${pairs.length})`}</span>
          </>
        )}
      </button>
    </div>
  );
};
