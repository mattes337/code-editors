import React, { useState, useRef } from 'react';
import { HostImage } from '../types';
import { Image as ImageIcon, GripVertical, Plus, Trash2, Link as LinkIcon, Upload, X } from 'lucide-react';
import { ImageCropperModal } from './ImageCropperModal';

interface ImageGalleryPanelProps {
  images: HostImage[];
  onInsert?: (text: string) => void;
  onAddImage: (img: HostImage) => void;
  onDeleteImage: (id: string) => void;
}

export const ImageGalleryPanel: React.FC<ImageGalleryPanelProps> = ({ 
    images, 
    onInsert,
    onAddImage,
    onDeleteImage
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [addMethod, setAddMethod] = useState<'url' | 'upload'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  
  // Cropper State
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [imgName, setImgName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getImgTag = (img: HostImage) => {
    // Use Handlebars array notation to support names with spaces/special chars
    // This keeps the editor clean (no base64) while allowing the preview to render it via context
    return `<img src="{{ images.[${img.name}] }}" alt="${img.name}" style="display:block; max-width:100%; height:auto; border:0;" />`;
  };

  const handleDragStart = (e: React.DragEvent, img: HostImage) => {
    const text = getImgTag(img);
    e.dataTransfer.setData('text/plain', text);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = (img: HostImage) => {
    if (onInsert) {
      onInsert(getImgTag(img));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setFileInput(file);
          setImgName(file.name.split('.')[0]);
          
          // Read for cropping
          const reader = new FileReader();
          reader.onload = () => {
              setCropSrc(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleUrlSubmit = () => {
      if (!urlInput) return;
      setImgName('From URL');
      setCropSrc(urlInput);
  };

  const handleCropComplete = (base64: string) => {
      const newImage: HostImage = {
          id: Date.now().toString(),
          name: imgName || 'New Image',
          url: base64
      };
      onAddImage(newImage);
      setCropSrc(null);
      setIsAdding(false);
      setUrlInput('');
      setFileInput(null);
      setImgName('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden relative">
      <div className="px-4 py-3 bg-white border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider shadow-sm z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <ImageIcon size={14} className="text-teal-600" />
            <span>Image Gallery</span>
        </div>
        <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`p-1 rounded hover:bg-slate-100 transition-colors ${isAdding ? 'text-teal-600 bg-teal-50' : 'text-slate-400'}`}
            title={isAdding ? "Cancel Add" : "Add Image"}
        >
            {isAdding ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 pb-20">
        
        {isAdding && (
            <div className="mb-4 bg-white rounded-xl border border-teal-200 shadow-sm overflow-hidden animate-in slide-in-from-top-2">
                <div className="flex border-b border-slate-100">
                    <button 
                        onClick={() => setAddMethod('upload')}
                        className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 ${addMethod === 'upload' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Upload size={12} /> Upload
                    </button>
                    <button 
                        onClick={() => setAddMethod('url')}
                        className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 ${addMethod === 'url' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <LinkIcon size={12} /> URL
                    </button>
                </div>
                
                <div className="p-3">
                    {addMethod === 'upload' ? (
                        <div className="flex flex-col gap-2">
                             <input 
                                type="file" 
                                accept="image/*" 
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                             />
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/50 transition-all text-xs font-medium flex flex-col items-center justify-center gap-2"
                             >
                                <Upload size={20} />
                                {fileInput ? fileInput.name : 'Click to select file'}
                             </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <input 
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
                                placeholder="https://example.com/image.png"
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                            />
                            <button 
                                onClick={handleUrlSubmit}
                                disabled={!urlInput}
                                className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        <p className="text-[10px] text-slate-400 mb-3">
          Drag and drop images into the editor.
        </p>
        
        <div className="grid grid-cols-2 gap-3">
            {images.map(img => (
                <div 
                    key={img.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, img)}
                    onClick={() => handleClick(img)}
                    className="group relative bg-white rounded-lg border border-slate-200 hover:border-teal-400 hover:shadow-sm cursor-pointer active:cursor-grabbing transition-all overflow-hidden flex flex-col"
                    title={img.name}
                >
                    <div className="aspect-video w-full bg-slate-100 flex items-center justify-center p-2 overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlMmU4ZjAiLz4KPHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2UyZThmMCIvPgo8L3N2Zz4=')]">
                        <img src={img.url} alt={img.name} className="max-w-full max-h-full object-contain shadow-sm" />
                    </div>
                    <div className="p-2 border-t border-slate-100 flex justify-between items-center">
                        <div className="text-xs font-medium text-slate-700 truncate max-w-[80px]">{img.name}</div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteImage(img.id); }}
                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete Image"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                    
                    <div className="absolute top-1 right-1 bg-white/90 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm pointer-events-none">
                         <GripVertical size={12} className="text-slate-500" />
                    </div>
                </div>
            ))}
        </div>
        {images.length === 0 && (
             <div className="text-center p-4 text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded-xl mt-2">
                No images available.
             </div>
        )}
      </div>

      <ImageCropperModal 
        isOpen={!!cropSrc}
        src={cropSrc || ''}
        onClose={() => setCropSrc(null)}
        onCrop={handleCropComplete}
      />
    </div>
  );
};