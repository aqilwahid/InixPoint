import React, { useRef, useState, useEffect } from 'react';

interface DrawingCanvasProps {
  onSave: (dataUrl: string) => void;
  disabled?: boolean;
  backgroundImage?: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSave, disabled, backgroundImage }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0284c7');
  const [lineWidth] = useState(4);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = backgroundImage;
    }
  }, [backgroundImage]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = backgroundImage;
    }
    setHasDrawn(false);
    onSave('');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="flex items-center justify-between w-full mb-2 px-1">
        <div className="flex items-center space-x-2">
          {['#0284c7', '#ef4444', '#10b981', '#f59e0b', '#1e293b'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-7 h-7 rounded-full border-2 transition ${
                color === c ? 'border-black scale-110' : 'border-white'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded font-medium text-slate-700"
        >
          Bersihkan
        </button>
      </div>

      <div className="w-full aspect-[4/3] border-2 border-slate-300 rounded-lg overflow-hidden shadow-inner bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={450}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      {!hasDrawn && (
        <p className="text-xs text-slate-400 mt-1">Coretkan jawaban atau tanda tangan Anda di atas kanvas</p>
      )}
    </div>
  );
};
