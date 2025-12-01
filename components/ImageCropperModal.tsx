import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Crop as CropIcon, Maximize } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  src: string;
  onClose: () => void;
  onCrop: (base64: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  src,
  onClose,
  onCrop,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Crop state in % to be responsive
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
      if (isOpen) {
          // Reset crop on open
          setCrop({ x: 10, y: 10, width: 80, height: 80 });
          setImgLoaded(false);
      }
  }, [isOpen, src]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize') => {
      e.preventDefault();
      e.stopPropagation();
      if (type === 'move') setIsDragging(true);
      if (type === 'resize') setIsResizing(true);
      setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging && !isResizing) return;
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

      if (isDragging) {
          setCrop(prev => ({
              ...prev,
              x: Math.min(Math.max(prev.x + deltaX, 0), 100 - prev.width),
              y: Math.min(Math.max(prev.y + deltaY, 0), 100 - prev.height)
          }));
      } else if (isResizing) {
          setCrop(prev => ({
              ...prev,
              width: Math.min(Math.max(prev.width + deltaX, 10), 100 - prev.x),
              height: Math.min(Math.max(prev.height + deltaY, 10), 100 - prev.y)
          }));
      }

      setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
  };

  const handleCrop = () => {
      if (!imageRef.current) return;
      
      const canvas = document.createElement('canvas');
      const image = imageRef.current;
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      
      // Calculate pixel dimensions
      const pixelCrop = {
          x: (crop.x / 100) * image.width * scaleX,
          y: (crop.y / 100) * image.height * scaleY,
          width: (crop.width / 100) * image.width * scaleX,
          height: (crop.height / 100) * image.height * scaleY
      };

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
      );

      const base64 = canvas.toDataURL('image/png');
      onCrop(base64);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <CropIcon size={20} className="text-teal-600" />
            Crop Image
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div 
            className="flex-1 bg-slate-900 flex items-center justify-center p-8 overflow-hidden relative select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
             <div className="relative inline-block max-w-full max-h-full" ref={containerRef}>
                <img 
                    ref={imageRef}
                    src={src} 
                    alt="To Crop" 
                    className="max-w-full max-h-[60vh] object-contain block select-none pointer-events-none"
                    onLoad={() => setImgLoaded(true)}
                />
                
                {imgLoaded && (
                    <>
                        {/* Overlay: Darken outside areas */}
                        <div className="absolute inset-0 bg-black/50 pointer-events-none">
                             {/* The 'hole' is achieved by using the inverse of the crop area? 
                                 CSS clip-path is easier, but simplistic approach:
                                 Just use box-shadow on the crop box to darken outside 
                             */}
                        </div>
                        
                        {/* Crop Box */}
                        <div 
                            className="absolute border-2 border-white box-content cursor-move group hover:border-teal-400 transition-colors"
                            style={{
                                left: `${crop.x}%`,
                                top: `${crop.y}%`,
                                width: `${crop.width}%`,
                                height: `${crop.height}%`,
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' // Darken outside
                            }}
                            onMouseDown={(e) => handleMouseDown(e, 'move')}
                        >
                            {/* Grid Lines (Visual) */}
                            <div className="absolute inset-0 flex flex-col pointer-events-none opacity-30">
                                <div className="flex-1 border-b border-white/50"></div>
                                <div className="flex-1 border-b border-white/50"></div>
                                <div className="flex-1"></div>
                            </div>
                            <div className="absolute inset-0 flex pointer-events-none opacity-30">
                                <div className="flex-1 border-r border-white/50"></div>
                                <div className="flex-1 border-r border-white/50"></div>
                                <div className="flex-1"></div>
                            </div>

                            {/* Resize Handle */}
                            <div 
                                className="absolute bottom-0 right-0 w-6 h-6 bg-teal-500 cursor-nwse-resize z-10 flex items-center justify-center shadow-lg transform translate-x-1/2 translate-y-1/2 rounded-full hover:scale-110 transition-transform"
                                onMouseDown={(e) => handleMouseDown(e, 'resize')}
                            >
                                <Maximize size={12} className="text-white" />
                            </div>
                        </div>
                    </>
                )}
             </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
             <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
               Cancel
             </button>
             <button onClick={handleCrop} className="flex items-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium shadow-sm shadow-teal-600/20 transition-all">
               <Check size={16} />
               Save Image
             </button>
        </div>
      </div>
    </div>
  );
};