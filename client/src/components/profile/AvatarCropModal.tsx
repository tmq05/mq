import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Check, Crop } from 'lucide-react';
import { Button } from '../common/Button.js';

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onApply: (croppedBase64: string) => void;
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onApply,
}) => {
  const [zoom, setZoom] = useState(1);
  const [cropShape, setCropShape] = useState<'circle' | 'square'>('circle');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset state when modal opens with new image
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imgRef.current = img;
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCropAndApply = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    if (cropShape === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    // Scale calculation
    const imgAspect = img.width / img.height;
    let baseWidth = size;
    let baseHeight = size;

    if (imgAspect > 1) {
      baseWidth = size * imgAspect;
    } else {
      baseHeight = size / imgAspect;
    }

    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;

    const centerX = size / 2;
    const centerY = size / 2;

    const drawX = centerX - drawWidth / 2 + position.x;
    const drawY = centerY - drawHeight / 2 + position.y;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onApply(croppedDataUrl);
    onClose();
  }, [cropShape, zoom, position, onApply, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-md rounded-2xl border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark-card shadow-2xl p-6 space-y-5 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-3">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-ink dark:text-white" />
            <h3 id="crop-modal-title" className="font-display font-bold text-lg text-ink dark:text-white">
              Cắt ảnh đại diện
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-mute hover:text-ink dark:hover:text-white hover:bg-surface-soft dark:hover:bg-surface-dark-soft transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Preview Viewport */}
        <div
          className="relative w-64 h-64 mx-auto rounded-xl overflow-hidden bg-neutral-900 border border-hairline dark:border-hairline-dark cursor-grab active:cursor-grabbing flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Target image with pan and zoom */}
          {imageSrc && (
            <img
              src={imageSrc}
              alt="Xem trước cắt ảnh"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
              className="pointer-events-none transition-transform duration-75 ease-out"
            />
          )}

          {/* Mask Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`w-52 h-52 border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ${
                cropShape === 'circle' ? 'rounded-full' : 'rounded-lg'
              }`}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Shape Selector */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCropShape('circle')}
              className={`px-3 py-1 text-xs font-sans rounded-pill transition-colors ${
                cropShape === 'circle'
                  ? 'bg-ink text-white dark:bg-white dark:text-black font-semibold'
                  : 'bg-surface-soft dark:bg-surface-dark-soft text-body dark:text-mute hover:text-ink dark:hover:text-white'
              }`}
            >
              Hình tròn
            </button>
            <button
              type="button"
              onClick={() => setCropShape('square')}
              className={`px-3 py-1 text-xs font-sans rounded-pill transition-colors ${
                cropShape === 'square'
                  ? 'bg-ink text-white dark:bg-white dark:text-black font-semibold'
                  : 'bg-surface-soft dark:bg-surface-dark-soft text-body dark:text-mute hover:text-ink dark:hover:text-white'
              }`}
            >
              Hình vuông
            </button>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-3 px-4">
            <ZoomOut className="w-4 h-4 text-mute shrink-0" />
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              aria-label="Thu phóng ảnh"
              className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-ink dark:accent-white"
            />
            <ZoomIn className="w-4 h-4 text-mute shrink-0" />
          </div>
          <p className="text-center text-[11px] text-mute">
            Kéo để di chuyển ảnh, sử dụng thanh trượt để phóng to/thu nhỏ
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-hairline dark:border-hairline-dark">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCropAndApply}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            Áp dụng ảnh
          </Button>
        </div>
      </div>
    </div>
  );
};
