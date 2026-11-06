import React, { useRef, useState, useEffect } from 'react';
import { 
  Pen, 
  Highlighter, 
  Disc, 
  Eraser, 
  RotateCcw, 
  X, 
  Layout 
} from 'lucide-react';

export type AnnotationTool = 'cursor' | 'laser' | 'pen' | 'highlighter' | 'eraser';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: 'pen' | 'highlighter';
  color: string;
  size: number;
  points: Point[];
}

interface AnnotationToolkitProps {
  isOpen: boolean;
  onClose: () => void;
  isWhiteboard: boolean;
  onToggleWhiteboard: () => void;
}

export const AnnotationToolkit: React.FC<AnnotationToolkitProps> = ({
  isOpen,
  onClose,
  isWhiteboard,
  onToggleWhiteboard,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('pen');
  const [color, setColor] = useState('#ef4444'); // default red
  const [size] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [laserPos, setLaserPos] = useState<Point | null>(null);

  // Resize canvas to match screen
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        redraw();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
      } else {
        ctx.globalAlpha = 1.0;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  };

  useEffect(() => {
    redraw();
  }, [strokes]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'cursor' || activeTool === 'laser') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (activeTool === 'eraser') {
      // Erase strokes near click
      setStrokes((prev) =>
        prev.filter((stroke) =>
          !stroke.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 25)
        )
      );
      return;
    }

    isDrawingRef.current = true;
    const newStroke: Stroke = {
      tool: activeTool,
      color,
      size: activeTool === 'highlighter' ? size * 4 : size,
      points: [pt],
    };
    currentStrokeRef.current = newStroke;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (activeTool === 'laser') {
      setLaserPos(pt);
      return;
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    currentStrokeRef.current.points.push(pt);

    // Incremental draw
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const pts = currentStrokeRef.current.points;
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.strokeStyle = currentStrokeRef.current.color;
        ctx.lineWidth = currentStrokeRef.current.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = currentStrokeRef.current.tool === 'highlighter' ? 0.35 : 1.0;
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    }
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current && currentStrokeRef.current) {
      isDrawingRef.current = false;
      const finished = currentStrokeRef.current;
      currentStrokeRef.current = null;
      setStrokes((prev) => [...prev, finished]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 select-none ${isWhiteboard ? 'bg-slate-950' : 'bg-transparent'}`}>
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setLaserPos(null);
        }}
        className={`absolute inset-0 w-full h-full touch-none ${
          activeTool === 'laser'
            ? 'cursor-none'
            : activeTool === 'pen' || activeTool === 'highlighter'
            ? 'cursor-crosshair'
            : activeTool === 'eraser'
            ? 'cursor-cell'
            : 'pointer-events-none'
        }`}
      />

      {/* Laser Pointer Glow Effect */}
      {activeTool === 'laser' && laserPos && (
        <div
          className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2"
          style={{ left: laserPos.x, top: laserPos.y }}
        >
          <div className="w-5 h-5 rounded-full bg-rose-500 shadow-[0_0_20px_6px_rgba(244,63,94,0.9)] animate-ping absolute inset-0 opacity-75" />
          <div className="w-3.5 h-3.5 rounded-full bg-red-400 border border-white shadow-[0_0_12px_4px_rgba(239,68,68,1)] relative z-10 m-auto" />
        </div>
      )}

      {/* Floating Bottom Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2 px-3 shadow-2xl backdrop-blur-md flex items-center space-x-1.5 sm:space-x-2 text-white">
        {/* Laser Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('laser')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeTool === 'laser' ? 'bg-rose-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="Laser Pointer (P-13)"
        >
          <Disc className="w-4 h-4 text-rose-400" />
          <span className="hidden sm:inline">Laser</span>
        </button>

        {/* Pen Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('pen')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeTool === 'pen' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="Pena Coret (P-13)"
        >
          <Pen className="w-4 h-4 text-brand-300" />
          <span className="hidden sm:inline">Pen</span>
        </button>

        {/* Highlighter Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('highlighter')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeTool === 'highlighter' ? 'bg-amber-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="Stabilo / Highlighter (P-13)"
        >
          <Highlighter className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">Stabilo</span>
        </button>

        {/* Color Palette (Pen/Highlighter) */}
        {(activeTool === 'pen' || activeTool === 'highlighter') && (
          <div className="flex items-center space-x-1 px-1 border-l border-slate-700">
            {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ffffff'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border border-slate-600 transition ${
                  color === c ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        )}

        {/* Eraser */}
        <button
          type="button"
          onClick={() => setActiveTool('eraser')}
          className={`p-1.5 rounded-xl transition ${
            activeTool === 'eraser' ? 'bg-slate-700 text-amber-300' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title="Penghapus Coretan"
        >
          <Eraser className="w-4 h-4" />
        </button>

        {/* Clear All */}
        <button
          type="button"
          onClick={() => setStrokes([])}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
          title="Hapus Semua Coretan"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* Whiteboard Toggle */}
        <button
          type="button"
          onClick={onToggleWhiteboard}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
            isWhiteboard ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="Papan Tulis Kosong (Whiteboard)"
        >
          <Layout className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Whiteboard</span>
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-rose-600 text-slate-400 hover:text-white transition"
          title="Tutup Alat Anotasi (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
