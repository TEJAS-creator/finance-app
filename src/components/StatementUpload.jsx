import { useState, useRef } from 'react';
import { UploadCloud, FileText, X, CheckCircle2 } from 'lucide-react';

export default function StatementUpload({ onFileLoaded }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  
  const fileInputRef = useRef(null);

  // Drag listeners
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (!isUploading) fileInputRef.current.click();
  };

    const processFile = async (file) => {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      setActiveFile(file);
      setIsUploading(true);
      setUploadProgress(20);

      try {
        let textContent = '';
        
        if (fileExtension === 'csv') {
          const reader = new FileReader();
          reader.onprogress = (data) => {
            if (data.lengthComputable) {
              const progress = Math.round((data.loaded / data.total) * 100);
              setUploadProgress(Math.min(progress, 90));
            }
          };
          reader.onload = async (e) => {
            setUploadProgress(100);
            setIsUploading(false);
            textContent = e.target.result;
            if (onFileLoaded) {
              onFileLoaded(textContent, 'csv', file.name);
            }
          };
          reader.readAsText(file);
        } else if (fileExtension === 'pdf') {
          // Dynamic import of PDF extractor
          const { pdfExtractor } = await import('../utils/pdfExtractor');
          setUploadProgress(50);
          textContent = await pdfExtractor.extractText(file);
          setUploadProgress(100);
          setIsUploading(false);
          if (onFileLoaded) {
            onFileLoaded(textContent, 'pdf', file.name);
          }
        } else {
          throw new Error('Unsupported file format. Please upload CSV or PDF.');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        alert(err.message || 'Failed to read file.');
        setActiveFile(null);
        setIsUploading(false);
        setUploadProgress(0);
      }
    };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setActiveFile(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  // Convert bytes into readable metric sizes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <input 
        type="file" ref={fileInputRef} onChange={handleFileChange}
        className="file-input-hidden" accept=".csv,.pdf" 
      />

      <div 
        className={`dropzone-container ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag} onDragOver={handleDrag}
        onDragLeave={handleDrag} onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        {!activeFile ? (
          <>
            <UploadCloud size={32} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
            <p style={{ fontWeight: 500, color: 'var(--text-main)' }}>
              Drag and drop your statement or <span style={{ color: 'var(--primary)', fontWeight: 600 }}>browse</span>
            </p>
            <p style={{ fontSize: '0.8rem' }}>Supports standard .csv, .pdf files</p>
          </>
        ) : (
          <div style={{ width: '100%' }}>
            <div className="active-file-card">
              <div className="file-details">
                <FileText size={20} style={{ color: 'var(--primary)' }} />
                <div style={{ textAlign: 'left' }}>
                  <p className="file-name">{activeFile.name}</p>
                  <p className="file-size">{formatBytes(activeFile.size)}</p>
                </div>
              </div>
              {!isUploading && (
                <button className="remove-file-btn" onClick={handleRemoveFile}>
                  <X size={16} />
                </button>
              )}
            </div>

            {isUploading && (
              <div className="progress-wrapper">
                <div className="progress-meta">
                  <span>Reading and extracting data fields...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            {!isUploading && uploadProgress === 100 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.8rem', marginTop: '12px', justifyContent: 'center', fontWeight: 500 }}>
                <CheckCircle2 size={14} />
                Statement successfully extracted. Dashboard synced.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}