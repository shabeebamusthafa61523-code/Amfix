import React, { useRef } from 'react';
import { UploadCloud, X } from 'lucide-react';

const SignatureUpload = ({ value, onChange, placeholder = "Upload signature image", disabled = false }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (disabled) return;
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("File size exceeds 1MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result); // Base64 data URL
      };
      reader.readAsDataURL(file);
    }
  };

  const isImage = value && value.startsWith('data:image/');
  const hasText = value && !isImage;

  return (
    <div className="space-y-2">
      {isImage ? (
        <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 flex items-center justify-center h-20 group">
          <img src={value} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-1 right-1 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
            >
              <X size={10} />
            </button>
          )}
        </div>
      ) : hasText ? (
        <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 flex items-center justify-between h-11 group">
          <span className="font-mono text-xs text-slate-700 dark:text-slate-350 italic">{value}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 text-slate-400 hover:text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ) : (
        <div 
          onClick={() => !disabled && fileInputRef.current.click()}
          className={`border border-dashed rounded-xl p-3 flex flex-col items-center justify-center min-h-[5.5rem] text-center transition-all ${
            disabled 
              ? "border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-slate-950/20 cursor-not-allowed text-slate-400" 
              : "border-slate-300 hover:border-indigo-500 dark:border-slate-800 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-950/20 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/40"
          }`}
        >
          <UploadCloud size={20} className={`${disabled ? "text-slate-300 dark:text-slate-700" : "text-slate-400 dark:text-slate-500"} mb-1`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {disabled ? "Signature not uploaded" : placeholder}
          </span>
          {!disabled && <span className="text-[9px] text-slate-400">PNG, JPG (Max 1MB)</span>}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};

export default SignatureUpload;
