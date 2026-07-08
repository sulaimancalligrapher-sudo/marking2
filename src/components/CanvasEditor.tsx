import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, ZoomIn, ZoomOut, Maximize, RotateCw, Undo, Redo, HelpCircle } from 'lucide-react';
import { WatermarkSettings } from '../types';

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface Path {
  points: Point[];
  lineWidth: number;
  lineColor: string;
  isChisel: boolean;
  nibAngle: number;
}

interface Sticker {
  x: number;
  y: number;
  base64: string;
  size: number;
}

interface TextItem {
  lines: string[];
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  background: { enabled: boolean; color: string };
}

interface CanvasEditorProps {
  imageBase64: string | null;
  mode: 'draw' | 'sticker' | 'text';
  lineWidth: number;
  lineColor: string;
  isChisel: boolean;
  nibAngle: number;
  selectedStickerBase64: string | null;
  stickerSize: number;
  textFeedback: string;
  fontSize: number;
  fontFamily: string;
  onSaveCanvas: (canvasExport: string) => void;
  editorRef: React.MutableRefObject<any>;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  watermarkSettings?: WatermarkSettings | null;
  watermarkLogoBase64?: string | null;
  applyWatermark?: boolean;
}

export default function CanvasEditor({
  imageBase64,
  mode,
  lineWidth,
  lineColor,
  isChisel,
  nibAngle,
  selectedStickerBase64,
  stickerSize,
  textFeedback,
  fontSize,
  fontFamily,
  onSaveCanvas,
  editorRef,
  scale,
  setScale,
  watermarkSettings = null,
  watermarkLogoBase64 = null,
  applyWatermark = false
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);

  // Sticker image elements cache to prevent CPU lag/garbage collection thrashing on redraws
  const stickerImageCache = useRef<Record<string, HTMLImageElement>>({});

  // Drawing state
  const [drawnPaths, setDrawnPaths] = useState<Path[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [history, setHistory] = useState<Array<{ type: 'path' | 'sticker' | 'text'; index: number }>>([]);
  const [redoHistory, setRedoHistory] = useState<Array<{ type: 'path' | 'sticker' | 'text'; data: any }>>([]);

  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [logoElement, setLogoElement] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (watermarkLogoBase64) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setLogoElement(img);
      };
      img.src = watermarkLogoBase64;
    } else {
      setLogoElement(null);
    }
  }, [watermarkLogoBase64]);

  // Pan / Zoom refs
  const dragStart = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const touchStartDist = useRef<number | null>(null);
  const lastDrawPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (imageBase64) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImgElement(img);
        setDrawnPaths([]);
        setStickers([]);
        setTexts([]);
        setHistory([]);
        setRedoHistory([]);
        setScale(1);
        setOffsetX(0);
        setOffsetY(0);
      };
      img.src = imageBase64;
    } else {
      setImgElement(null);
    }
  }, [imageBase64]);

  // Redraw Canvas whenever anything transforms
  useEffect(() => {
    drawAll();
  }, [imgElement, scale, offsetX, offsetY, drawnPaths, stickers, texts]);

  // Expose methods via editorRef
  useEffect(() => {
    if (editorRef) {
      editorRef.current = {
        undo,
        redo,
        clearAll,
        resetView,
        rotate95,
        exportCanvas
      };
    }
  }, [drawnPaths, stickers, texts, history, redoHistory, imgElement]);

  const undo = () => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];
    const updatedHistory = history.slice(0, -1);

    if (lastAction.type === 'path') {
      const pathToRemove = drawnPaths[lastAction.index];
      setRedoHistory([...redoHistory, { type: 'path', data: pathToRemove }]);
      setDrawnPaths(drawnPaths.filter((_, idx) => idx !== lastAction.index));
    } else if (lastAction.type === 'sticker') {
      const stickerToRemove = stickers[lastAction.index];
      setRedoHistory([...redoHistory, { type: 'sticker', data: stickerToRemove }]);
      setStickers(stickers.filter((_, idx) => idx !== lastAction.index));
    } else if (lastAction.type === 'text') {
      const textToRemove = texts[lastAction.index];
      setRedoHistory([...redoHistory, { type: 'text', data: textToRemove }]);
      setTexts(texts.filter((_, idx) => idx !== lastAction.index));
    }
    setHistory(updatedHistory);
  };

  const redo = () => {
    if (redoHistory.length === 0) return;
    const action = redoHistory[redoHistory.length - 1];
    const updatedRedo = redoHistory.slice(0, -1);

    if (action.type === 'path') {
      setDrawnPaths([...drawnPaths, action.data]);
      setHistory([...history, { type: 'path', index: drawnPaths.length }]);
    } else if (action.type === 'sticker') {
      setStickers([...stickers, action.data]);
      setHistory([...history, { type: 'sticker', index: stickers.length }]);
    } else if (action.type === 'text') {
      setTexts([...texts, action.data]);
      setHistory([...history, { type: 'text', index: texts.length }]);
    }
    setRedoHistory(updatedRedo);
  };

  const clearAll = () => {
    setDrawnPaths([]);
    setStickers([]);
    setTexts([]);
    setHistory([]);
    setRedoHistory([]);
  };

  const resetView = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const rotatePoint = (x: number, y: number, angle: number, cx: number, cy: number) => {
    const radians = (angle * Math.PI) / 180;
    const dx = x - cx;
    const dy = y - cy;
    const newX = dx * Math.cos(radians) - dy * Math.sin(radians);
    const newY = dx * Math.sin(radians) + dy * Math.cos(radians);
    return { x: newX + cx, y: newY + cy };
  };

  const rotate95 = async () => {
    if (!imgElement) return;

    // Rotate background image via offscreen canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = imgElement.height;
    tempCanvas.height = imgElement.width;

    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate((90 * Math.PI) / 180);
    tempCtx.drawImage(imgElement, -imgElement.width / 2, -imgElement.height / 2);

    const rotatedImg = new Image();
    rotatedImg.onload = () => {
      const oldWidth = imgElement.width;
      const oldHeight = imgElement.height;
      const cx = oldWidth / 2;
      const cy = oldHeight / 2;

      // Transform coordinates of all paths
      const newPaths = drawnPaths.map((path) => ({
        ...path,
        points: path.points.map((p) => {
          const rot = rotatePoint(p.x, p.y, 90, cx, cy);
          return { ...p, x: rot.x, y: rot.y };
        })
      }));

      // Transform coordinates of stickers
      const newStickers = stickers.map((st) => {
        const scx = st.x + st.size / 2;
        const scy = st.y + st.size / 2;
        const rot = rotatePoint(scx, scy, 90, cx, cy);
        return {
          ...st,
          x: rot.x - st.size / 2,
          y: rot.y - st.size / 2
        };
      });

      // Transform coordinates of text
      const newTexts = texts.map((t) => {
        const rot = rotatePoint(t.x, t.y, 90, cx, cy);
        return { ...t, x: rot.x, y: rot.y };
      });

      setDrawnPaths(newPaths);
      setStickers(newStickers);
      setTexts(newTexts);
      setImgElement(rotatedImg);
      resetView();
    };
    rotatedImg.src = tempCanvas.toDataURL();
  };

  const exportCanvas = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    if (applyWatermark && watermarkSettings) {
      const clone = document.createElement('canvas');
      clone.width = canvas.width;
      clone.height = canvas.height;
      const cloneCtx = clone.getContext('2d');
      if (cloneCtx) {
        // Draw the main canvas content
        cloneCtx.drawImage(canvas, 0, 0);

        // Helper parsers to make watermark configuration flexible & percentage-based as requested
        const parseOpacity = (val: string | number | undefined): number => {
          if (val === undefined || val === null || val === '') return 1.0;
          const s = String(val).trim();
          if (s.endsWith('%')) {
            const p = parseFloat(s.replace('%', ''));
            return isNaN(p) ? 1.0 : p / 100;
          }
          const num = parseFloat(s);
          if (isNaN(num)) return 1.0;
          if (num > 1.0) return num / 100; // e.g. "50" -> 0.5
          return num;
        };

        const parseSizeFactor = (val: string | number | undefined): number => {
          if (val === undefined || val === null || val === '') return 0.15; // default to 15% of canvas width
          const s = String(val).trim();
          if (s.endsWith('%')) {
            const p = parseFloat(s.replace('%', ''));
            return isNaN(p) ? 0.15 : p / 100;
          }
          const num = parseFloat(s);
          if (isNaN(num)) return 0.15;
          if (num > 1.0) return num / 100; // e.g. "15" -> 0.15
          return num;
        };

        const parseFontSize = (val: string | number | undefined, canvasWidth: number): number => {
          if (val === undefined || val === null || val === '') return canvasWidth * 0.02; // default to 2% of canvas width
          const s = String(val).trim();
          if (s.endsWith('%')) {
            const pct = parseFloat(s.replace('%', ''));
            return isNaN(pct) ? canvasWidth * 0.02 : canvasWidth * (pct / 100);
          }
          const num = parseFloat(s);
          if (isNaN(num)) return canvasWidth * 0.02;
          if (num < 1.0) {
            return canvasWidth * num;
          } else if (num <= 10) {
            return canvasWidth * (num / 100); // e.g. 2.5 means 2.5% of canvas width
          } else {
            const scaleFactor = canvasWidth / 1200;
            return num * scaleFactor;
          }
        };

        // 1. Draw Logo
        if (logoElement) {
          const logoWidthRatio = parseSizeFactor(watermarkSettings.sizeFactor);
          // Calculate the logo width relative to canvas width
          const logoWidth = canvas.width * logoWidthRatio;
          
          // Maintain the original aspect ratio (width & height proportion)
          const logoAspect = logoElement.naturalHeight / logoElement.naturalWidth;
          const logoHeight = logoWidth * logoAspect;
          
          const logoPadding = Math.min(canvas.width, canvas.height) * 0.04;

          let logoX = logoPadding;
          let logoY = logoPadding;

          if (watermarkSettings.logoPosition === 'top-left') {
            logoX = logoPadding;
            logoY = logoPadding;
          } else if (watermarkSettings.logoPosition === 'top-right') {
            logoX = canvas.width - logoWidth - logoPadding;
            logoY = logoPadding;
          } else if (watermarkSettings.logoPosition === 'bottom-left') {
            logoX = logoPadding;
            logoY = canvas.height - logoHeight - logoPadding;
          } else if (watermarkSettings.logoPosition === 'bottom-right') {
            logoX = canvas.width - logoWidth - logoPadding;
            logoY = canvas.height - logoHeight - logoPadding;
          } else if (watermarkSettings.logoPosition === 'center') {
            logoX = (canvas.width - logoWidth) / 2;
            logoY = (canvas.height - logoHeight) / 2;
          }

          cloneCtx.save();
          cloneCtx.globalAlpha = parseOpacity(watermarkSettings.opacity);
          cloneCtx.drawImage(logoElement, logoX, logoY, logoWidth, logoHeight);
          cloneCtx.restore();
        }

        // 2. Draw Text
        if (watermarkSettings.textPrefix) {
          const computedFontSize = Math.max(14, parseFontSize(watermarkSettings.fontSize, canvas.width));
          const textPadding = Math.min(canvas.width, canvas.height) * 0.04;

          cloneCtx.save();
          cloneCtx.direction = 'rtl';
          cloneCtx.font = `bold ${computedFontSize}px Amiri, Cairo, system-ui, sans-serif`;
          cloneCtx.shadowColor = 'rgba(0,0,0,0.85)';
          cloneCtx.shadowBlur = 6;
          cloneCtx.fillStyle = '#FFFFFF';

          const textToDraw = watermarkSettings.textPrefix;
          const textHeight = computedFontSize;

          let textX = textPadding;
          let textY = canvas.height - textPadding;

          if (watermarkSettings.textPosition === 'top-left') {
            textX = textPadding;
            textY = textPadding + textHeight;
          } else if (watermarkSettings.textPosition === 'top-right') {
            textX = canvas.width - textPadding;
            textY = textPadding + textHeight;
          } else if (watermarkSettings.textPosition === 'bottom-left') {
            textX = textPadding;
            textY = canvas.height - textPadding;
          } else if (watermarkSettings.textPosition === 'bottom-right') {
            textX = canvas.width - textPadding;
            textY = canvas.height - textPadding;
          } else if (watermarkSettings.textPosition === 'center') {
            textX = canvas.width / 2;
            textY = canvas.height / 2 + textHeight / 2;
          }

          if (watermarkSettings.textPosition.includes('right')) {
            cloneCtx.textAlign = 'right';
          } else if (watermarkSettings.textPosition.includes('left')) {
            cloneCtx.textAlign = 'left';
          } else {
            cloneCtx.textAlign = 'center';
          }

          cloneCtx.fillText(textToDraw, textX, textY);
          cloneCtx.restore();
        }

        return clone.toDataURL('image/jpeg', 0.95);
      }
    }

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const drawChiselSegment = (
    ctx: CanvasRenderingContext2D,
    p0: Point,
    p1: Point,
    angleDeg: number,
    baseWidth: number,
    color: string
  ) => {
    const rad = (angleDeg * Math.PI) / 180.0;
    const nibU = { x: Math.cos(rad), y: Math.sin(rad) };
    const p0Pressure = p0.pressure || 1;
    const p1Pressure = p1.pressure || 1;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(dist / 2));

    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const x0 = p0.x + dx * t0;
      const y0 = p0.y + dy * t0;
      const x1 = p0.x + dx * ((i + 1) / steps);
      const y1 = p0.y + dy * ((i + 1) / steps);
      const pr = p0Pressure * (1 - t0) + p1Pressure * t0;
      const w = baseWidth * pr;
      const half = w / 2;

      const l0 = { x: x0 + nibU.x * half, y: y0 + nibU.y * half };
      const r0 = { x: x0 - nibU.x * half, y: y0 - nibU.y * half };
      const l1 = { x: x1 + nibU.x * half, y: y1 + nibU.y * half };
      const r1 = { x: x1 - nibU.x * half, y: y1 - nibU.y * half };

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(l0.x, l0.y);
      ctx.lineTo(l1.x, l1.y);
      ctx.lineTo(r1.x, r1.y);
      ctx.lineTo(r0.x, r0.y);
      ctx.closePath();
      ctx.fill();
    }
  };

  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions - ONLY set if they have actually changed to avoid layout thrashing and lag
    const targetWidth = imgElement ? imgElement.width : 1200;
    const targetHeight = imgElement ? imgElement.height : 800;
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw background
    if (imgElement) {
      ctx.drawImage(imgElement, 0, 0);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw lines
    drawnPaths.forEach((path) => {
      if (path.points.length < 1) return;

      if (path.isChisel) {
        for (let i = 0; i < path.points.length - 1; i++) {
          drawChiselSegment(ctx, path.points[i], path.points[i + 1], path.nibAngle, path.lineWidth, path.lineColor);
        }
      } else {
        ctx.beginPath();
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = path.lineColor;
        path.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      }
    });

    // Draw stickers with caching to prevent severe rendering lag
    stickers.forEach((st) => {
      if (!st.base64) return;
      let img = stickerImageCache.current[st.base64];
      if (!img) {
        img = new Image();
        img.src = st.base64;
        stickerImageCache.current[st.base64] = img;
        img.onload = () => {
          drawAll(); // Redraw once loaded
        };
      }
      if (img.complete) {
        ctx.drawImage(img, st.x, st.y, st.size, st.size);
      }
    });

    // Draw Texts
    texts.forEach((text) => {
      ctx.save();
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.font = `bold ${text.fontSize}px ${text.fontFamily}`;

      const lineHeight = text.fontSize * 1.3;
      const maxWidth = Math.max(...text.lines.map((line) => ctx.measureText(line).width));
      const padding = 15;

      if (text.background?.enabled) {
        const rectWidth = maxWidth + padding * 2;
        const rectX = text.x - maxWidth - padding;
        const rectY = text.y - text.fontSize * 0.9;
        const rectHeight = text.lines.length * lineHeight + padding;

        ctx.fillStyle = text.background.color;
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }

      ctx.fillStyle = text.color;
      text.lines.forEach((line, index) => {
        ctx.fillText(line, text.x, text.y + index * lineHeight);
      });
      ctx.restore();
    });

    ctx.restore();
  };

  const getCanvasCoords = (e: any): { x: number; y: number; pressure: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 1 };
    const rect = canvas.getBoundingClientRect();

    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    const pressure = e.pressure || (e.touches && e.touches[0]?.force) || 1;

    // Convert client coords to raw canvas pixels
    const canvasX = ((clientX - rect.left) / rect.width) * canvas.width;
    const canvasY = ((clientY - rect.top) / rect.height) * canvas.height;

    // Inverse transform zoom and pan offset
    const adjustedX = (canvasX - offsetX) / scale;
    const adjustedY = (canvasY - offsetY) / scale;

    return { x: adjustedX, y: adjustedY, pressure };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 1 || mode === 'sticker' || mode === 'text' || e.shiftKey) {
      // Middle click, sticker placement or shift key -> Pan mode
      isPanning.current = true;
      dragStart.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
      return;
    }

    if (mode === 'draw') {
      setIsDrawing(true);
      const coords = getCanvasCoords(e);
      const newPath: Path = {
        points: [coords],
        lineWidth,
        lineColor,
        isChisel,
        nibAngle
      };
      setDrawnPaths([...drawnPaths, newPath]);
      setHistory([...history, { type: 'path', index: drawnPaths.length }]);
      setRedoHistory([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      setOffsetX(e.clientX - dragStart.current.x);
      setOffsetY(e.clientY - dragStart.current.y);
      return;
    }

    if (isDrawing && mode === 'draw') {
      const coords = getCanvasCoords(e);
      const pathsCopy = [...drawnPaths];
      const activePath = pathsCopy[pathsCopy.length - 1];
      if (activePath) {
        activePath.points.push(coords);
        setDrawnPaths(pathsCopy);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  // Touch handlers for Tablets / Stylus / Apple Pencil
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Zoom & Pan touch gesture
      setIsDrawing(false);
      isPanning.current = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));
      touchStartDist.current = dist;
      dragStart.current = {
        x: (t1.clientX + t2.clientX) / 2 - offsetX,
        y: (t1.clientY + t2.clientY) / 2 - offsetY
      };
      return;
    }

    if (e.touches.length === 1) {
      if (mode === 'sticker') {
        placeStickerAtCoords(e);
        return;
      }
      if (mode === 'text') {
        placeTextAtCoords(e);
        return;
      }

      setIsDrawing(true);
      const coords = getCanvasCoords(e);
      const newPath: Path = {
        points: [coords],
        lineWidth,
        lineColor,
        isChisel,
        nibAngle
      };
      setDrawnPaths([...drawnPaths, newPath]);
      setHistory([...history, { type: 'path', index: drawnPaths.length }]);
      setRedoHistory([]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning.current && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));

      // Calculate translation
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      setOffsetX(midX - dragStart.current.x);
      setOffsetY(midY - dragStart.current.y);

      // Calculate scale factor
      if (touchStartDist.current) {
        const factor = dist / touchStartDist.current;
        setScale(Math.max(0.3, Math.min(6, scale * factor)));
        touchStartDist.current = dist;
      }
      return;
    }

    if (isDrawing && mode === 'draw' && e.touches.length === 1) {
      const coords = getCanvasCoords(e);
      const pathsCopy = [...drawnPaths];
      const activePath = pathsCopy[pathsCopy.length - 1];
      if (activePath) {
        activePath.points.push(coords);
        setDrawnPaths(pathsCopy);
      }
    }
  };

  const handleTouchEnd = () => {
    isPanning.current = false;
    setIsDrawing(false);
    touchStartDist.current = null;
  };

  const placeStickerAtCoords = (e: any) => {
    if (!selectedStickerBase64) return;
    const coords = getCanvasCoords(e);

    const newSticker: Sticker = {
      x: coords.x - stickerSize / 2,
      y: coords.y - stickerSize / 2,
      base64: selectedStickerBase64,
      size: stickerSize
    };

    setStickers([...stickers, newSticker]);
    setHistory([...history, { type: 'sticker', index: stickers.length }]);
    setRedoHistory([]);
  };

  const placeTextAtCoords = (e: any) => {
    if (!textFeedback.trim()) return;
    const coords = getCanvasCoords(e);
    const lines = textFeedback.split('\n');

    const newText: TextItem = {
      lines,
      x: coords.x,
      y: coords.y,
      color: lineColor,
      fontSize,
      fontFamily,
      background: { enabled: true, color: '#FFFFFF' }
    };

    setTexts([...texts, newText]);
    setHistory([...history, { type: 'text', index: texts.length }]);
    setRedoHistory([]);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (mode === 'sticker') {
      placeStickerAtCoords(e);
    } else if (mode === 'text') {
      placeTextAtCoords(e);
    }
  };

  return (
    <div className="relative flex-grow bg-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-center items-center">
      {/* Dynamic Grid helper */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Editor canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCanvasClick}
      >
        <canvas
          ref={canvasRef}
          className="shadow-2xl bg-white max-h-[85vh] max-w-full rounded-lg select-none pointer-events-none"
        />
      </div>

      {/* Mode help tip */}
      <div className="absolute top-4 right-4 bg-slate-950/70 backdrop-blur py-1.5 px-3 rounded-full text-[10px] text-slate-300 pointer-events-none">
        {mode === 'draw' && 'قلم الرسم نشط • حرك بإصبعين للتنقل'}
        {mode === 'sticker' && 'وضع الأختام نشط • انقر لوضع الختم'}
        {mode === 'text' && 'وضع الملاحظات النصية نشط • انقر لوضع النص'}
      </div>
    </div>
  );
}
