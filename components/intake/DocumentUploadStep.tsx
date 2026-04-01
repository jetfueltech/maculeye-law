import React, { useState, useRef, useCallback } from 'react';

export interface PendingDocument {
  file: File;
  fileData: string;
  mimeType: string;
}

interface DocumentUploadStepProps {
  documents: PendingDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<PendingDocument[]>>;
}

export const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({
  documents,
  setDocuments,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [readingFiles, setReadingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const names = fileArray.map(f => f.name);
    setReadingFiles(prev => [...prev, ...names]);

    const results: PendingDocument[] = [];

    for (const file of fileArray) {
      try {
        const fileData = await readFileAsBase64(file);
        results.push({
          file,
          fileData,
          mimeType: file.type || 'application/octet-stream',
        });
      } catch {
        results.push({
          file,
          fileData: '',
          mimeType: file.type || 'application/octet-stream',
        });
      }
      setReadingFiles(prev => prev.filter(n => n !== file.name));
    }

    setDocuments(prev => [...prev, ...results]);
  }, [setDocuments]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return { bg: 'bg-red-50 text-red-500', label: 'PDF' };
    if (mimeType.includes('image')) return { bg: 'bg-blue-50 text-blue-500', label: 'IMG' };
    if (mimeType.includes('word') || mimeType.includes('document')) return { bg: 'bg-sky-50 text-sky-500', label: 'DOC' };
    return { bg: 'bg-stone-50 text-stone-500', label: 'FILE' };
  };

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto mb-2">
        <h4 className="text-xl font-bold text-stone-800 mb-2">Upload Client Documents</h4>
        <p className="text-sm text-stone-500 leading-relaxed">
          Upload all intake documents -- retainer, HIPAA authorization, police report, insurance cards, and any others.
          When you're ready, click "Extract & Review" and the AI will identify each document and pull out client information automatically.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragOver
            ? 'border-blue-400 bg-blue-50 scale-[1.01]'
            : 'border-stone-300 bg-stone-50 hover:border-blue-300 hover:bg-blue-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="flex flex-col items-center space-y-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isDragOver ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-white text-stone-400 border border-stone-200 shadow-sm'
          }`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-stone-700">
              {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-sm text-stone-400 mt-1">or click to browse -- PDF, images, and documents accepted</p>
          </div>
        </div>
      </div>

      {readingFiles.length > 0 && (
        <div className="space-y-3">
          {readingFiles.map(name => (
            <div key={name} className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-100 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-stone-200 flex items-center justify-center">
                <svg className="w-4 h-4 text-stone-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700">{name}</p>
                <p className="text-xs text-stone-400">Reading file...</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase text-stone-500 tracking-wider">
              Uploaded Files ({documents.length})
            </h5>
            <p className="text-xs text-stone-400">AI will identify document types when you click "Extract & Review"</p>
          </div>

          {documents.map((doc, i) => {
            const icon = getFileIcon(doc.mimeType);
            return (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-300 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${icon.bg}`}>
                  {doc.mimeType.includes('pdf') ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : doc.mimeType.includes('image') ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{doc.file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-stone-400 font-medium uppercase">{icon.label}</span>
                    <span className="text-[10px] text-stone-300">|</span>
                    <span className="text-[10px] text-stone-400">
                      {doc.file.size < 1024 * 1024
                        ? `${(doc.file.size / 1024).toFixed(0)} KB`
                        : `${(doc.file.size / (1024 * 1024)).toFixed(1)} MB`
                      }
                    </span>
                    <span className="text-[10px] text-stone-300">|</span>
                    <span className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Pending AI analysis
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removeDocument(i)}
                  className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
