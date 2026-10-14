import React, { useState } from 'react';
import { ArrowLeft, Trash2, Check, MessageSquare, AlertTriangle, Move } from 'lucide-react';
import { CommentCircle } from '../types';

interface CommentModalProps {
  comment: Partial<CommentCircle>;
  onBack: () => void;
  onSave: (title: string, text: string) => void;
  onDelete?: () => void;
  onReposition?: (currentTitle: string, currentText: string) => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  comment,
  onBack,
  onSave,
  onDelete,
  onReposition,
}) => {
  const [title, setTitle] = useState<string>(comment.title || '');
  const [text, setText] = useState<string>(comment.text || '');
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const handleSave = () => {
    onSave(title.trim() || 'Комментарий', text.trim());
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-5 text-slate-100 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          aria-label="Назад"
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-800 transition"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-wider">
          <MessageSquare size={18} />
          <span>{comment.id ? 'Редактирование комментария' : 'Новый комментарий'}</span>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Inputs Form */}
      <div className="flex flex-col gap-4 my-auto max-w-md w-full mx-auto">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Короткое название (метка над кружком)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Узел 3 / Вентканал"
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-sm font-semibold"
          />
          <span className="text-[11px] text-slate-500">
            Отображается над кружком в режиме просмотра
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Текст комментария
          </label>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Подробное описание замечания, требования или указания для монтажников..."
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-sm resize-none"
          />
          <span className="text-[11px] text-slate-500">
            Открывается при двойном касании кружка в режиме просмотра
          </span>
        </div>

        {/* Change position button */}
        {onReposition && (
          <button
            type="button"
            onClick={() => onReposition(title, text)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 active:scale-[0.98] text-amber-400 font-bold text-xs border border-amber-500/40 shadow-md transition"
          >
            <Move size={16} className="text-amber-400" />
            <span>Изменить положение кружка на чертеже</span>
          </button>
        )}
      </div>

      {/* Delete Confirmation Popup */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-5 max-w-xs w-full flex flex-col gap-4 text-center">
            <div className="mx-auto p-3 rounded-full bg-rose-500/20 text-rose-400">
              <AlertTriangle size={32} />
            </div>
            <div className="text-sm font-bold text-slate-100">Удалить комментарий?</div>
            <div className="text-xs text-slate-400">
              Кружок и текст комментария будут безвозвратно стерты со слоя чертежа.
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  onDelete?.();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="pb-4 flex gap-3 max-w-md w-full mx-auto">
        {onDelete && (
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 active:scale-95 text-rose-300 font-bold text-sm border border-rose-700/60 transition"
          >
            <Trash2 size={18} />
            <span>Удалить</span>
          </button>
        )}

        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-950/40 transition"
        >
          <Check size={20} className="stroke-[3]" />
          <span>Сохранить</span>
        </button>
      </div>
    </div>
  );
};
