import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react';

const FileUpload = ({ onFileSelected, accept = {} }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      setError("File type not supported.");
      return;
    }
    
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    if (onFileSelected) {
      onFileSelected(selectedFile);
    }
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false
  });

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setError(null);
    if (onFileSelected) onFileSelected(null);
  };

  return (
    <div className="w-full">
      {!file ? (
        <div 
          {...getRootProps()} 
          className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer h-64
            ${isDragActive 
              ? 'border-premium-accent bg-premium-accent/5 ring-4 ring-premium-accent/10' 
              : 'border-white/10 hover:border-premium-accent/50 hover:bg-white/5'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 rounded-full bg-premium-accent/10 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-premium-accent" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Upload Source File</h3>
          <p className="text-slate-400 text-sm text-center max-w-[200px]">
            Drag & drop video, image, audio or text files here
          </p>
          <div className="mt-4 flex gap-2">
            <span className="text-[10px] px-2 py-1 bg-white/5 rounded border border-white/10 text-slate-400 uppercase tracking-widest font-bold">.mp4</span>
            <span className="text-[10px] px-2 py-1 bg-white/5 rounded border border-white/10 text-slate-400 uppercase tracking-widest font-bold">.jpg</span>
            <span className="text-[10px] px-2 py-1 bg-white/5 rounded border border-white/10 text-slate-400 uppercase tracking-widest font-bold">.wav</span>
            <span className="text-[10px] px-2 py-1 bg-white/5 rounded border border-white/10 text-slate-400 uppercase tracking-widest font-bold">.txt</span>
          </div>
        </div>
      ) : (
        <div className="border border-white/10 rounded-2xl p-6 glass-morphism flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-premium-accent/20 flex items-center justify-center">
              <File className="w-6 h-6 text-premium-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emotion-positive" />
            <button 
              onClick={clearFile}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 flex items-center gap-2 text-emotion-negative text-xs bg-emotion-negative/10 border border-emotion-negative/20 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
