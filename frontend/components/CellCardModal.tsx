import React, { useRef, useState } from 'react';
import { ArrowLeft, Check, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { CellData } from '../types';
import { generateDemoBlueprint } from '../constants';

interface CellCardModalProps {
  row: number;
  col: number;
  initialCell?: CellData;
  onBack: () => void;
  onConfirm: (cell: CellData) => void;
}

export const CellCardModal: React.FC<CellCardModalProps> = ({
  row,
  col,
  initialCell,
  onBack,
  onConfirm,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState<string>(
    initialCell?.title || `Чертеж ячейки [${row + 1}, ${col + 1}]`
  );
  const [imageDataUrl, setImageDataUrl] = useState<string>(initialCell?.imageDataUrl || '');
  const [imageFileName, setImageFileName] = useState<string>(initialCell?.imageFileName || '');
  const [imageWidth, setImageWidth] = useState<number>(initialCell?.imageWidth || 1200);
  const [imageHeight, setImageHeight] = useState<number>(initialCell?.imageHeight || 800);

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string;
      if (result) {
        setImageDataUrl(result);
        const img = new Image();
        img.onload = () => {
          setImageWidth(img.naturalWidth || 1200);
          setImageHeight(img.naturalHeight || 800);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseDemoScan = () => {
    const demo = generateDemoBlueprint(
      col % 2 === 0 ? 'HVAC' : 'ELEC',
      title || `План ячейки [${row + 1}, ${col + 1}]`
    );
    setImageDataUrl(demo);
    setImageFileName(`demo_scan_${row + 1}_${col + 1}.svg`);
    setImageWidth(1200);
    setImageHeight(800);
  };

  const handleConfirm = () => {
    const cell: CellData = {
      row,
      col,
      title: title.trim() || `Чертеж [${row + 1}, ${col + 1}]`,
      imageFileName: imageFileName || 'unnamed_blueprint.png',
      imageDataUrl: imageDataUrl,
      imageWidth: imageWidth || 1200,
      imageHeight: imageHeight || 800,
      customPosition: initialCell?.customPosition || false,
      commonPoint: initialCell?.commonPoint || {
        x: Math.round((imageWidth || 1200) / 2),
        y: Math.round((imageHeight || 800) / 2),
      },
      comments: initialCell?.comments || [],
    };
    onConfirm(cell);
  };

  return (
    <div className="relative flex flex-col justify-between h-full w-full max-w-md mx-auto p-5 bg-slate-950 text-slate-100 border-x border-slate-800 select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.svg"
        className="hidden"
        onChange={handleFilePicked}
      />

      {/* Top Bar with back arrow */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          aria-label="Назад"
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-800 transition"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="text-center">
          <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400">
            Карточка ячейки [{row + 1}, {col + 1}]
          </span>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Card Content */}
      <div className="flex flex-col gap-4 my-auto">
        {/* Title Input at Top of Card */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Название чертежа / коммуникации
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: План вентиляции 1-го этажа"
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-sm font-semibold"
          />
        </div>

        {/* Blueprint Scan Preview Area in Middle */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wide">Скан изображения</span>
            {imageFileName && (
              <span className="text-[11px] text-amber-400 truncate max-w-[180px]">
                {imageFileName}
              </span>
            )}
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full h-56 rounded-2xl bg-slate-900/90 border-2 border-dashed border-slate-700 hover:border-amber-500/70 cursor-pointer overflow-hidden flex flex-col items-center justify-center p-2 group transition-all"
          >
            {imageDataUrl ? (
              <>
                <img
                  src={imageDataUrl}
                  alt={title}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="px-3 py-1.5 bg-slate-900/90 rounded-lg text-xs font-semibold text-amber-400 border border-amber-500/40">
                    Нажмите, чтобы заменить
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors">
                  <ImageIcon size={28} />
                </div>
                <div className="text-sm font-bold text-slate-300">
                  Изображение не загружено
                </div>
                <div className="text-xs text-slate-500">
                  Нажмите кнопку «Загрузить» ниже или выберите файл из памяти
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fast generator button for quick testing */}
        {!imageDataUrl && (
          <button
            onClick={handleUseDemoScan}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 text-xs border border-slate-800 transition"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Вставить пример инженерного скана</span>
          </button>
        )}
      </div>

      {/* Two Action Buttons at Bottom */}
      <div className="pb-3 flex gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-sm border border-slate-700 transition"
        >
          <Upload size={18} className="text-amber-400" />
          <span>Загрузить</span>
        </button>

        <button
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-950/40 transition"
        >
          <Check size={20} className="stroke-[3]" />
          <span>Подтвердить</span>
        </button>
      </div>
    </div>
  );
};
