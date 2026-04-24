import { useRef, useState } from 'react';
import { formatFileSize } from '../lib/fileUtils.js';

const ACCEPT = '.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.html,.htm,.csv,.json,.xml,.txt,.zip,.epub,.msg,.jpg,.jpeg,.png,.gif,.bmp,.webp,.wav,.mp3';

const STATUS_META = {
  queued:     { cls: 'batch-status--queued',     icon: 'fa-clock',              label: 'QUEUED' },
  converting: { cls: 'batch-status--converting', icon: 'fa-spinner',            label: 'CONVERTING' },
  done:       { cls: 'batch-status--done',       icon: 'fa-circle-check',       label: 'DONE' },
  error:      { cls: 'batch-status--error',      icon: 'fa-circle-exclamation', label: 'ERROR' },
};

export default function BatchModal({ isOpen, onClose, files, onAddFiles, onConvertAll, onDownloadZip, onDownloadSingle, onRemoveFile, isRunning }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const hasQueued = files.some(f => f.status === 'queued');
  const hasDone = files.some(f => f.status === 'done');

  const total = files.length;
  const done = files.filter(f => f.status === 'done').length;
  const errors = files.filter(f => f.status === 'error').length;
  const processed = done + errors;
  const progressPct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const convertingFile = files.find(f => f.status === 'converting');

  const summaryParts = [];
  if (total > 0) {
    summaryParts.push(`${total} file${total !== 1 ? 's' : ''}`);
    if (done) summaryParts.push(`${done} done`);
    if (errors) summaryParts.push(`${errors} failed`);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) onAddFiles(e.dataTransfer.files);
  }

  return (
    <div
      id="batch-modal"
      className={`modal-overlay${isOpen ? ' active' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="modal-container modal-container--wide">
        <div className="modal-header">
          <h3 style={{ fontFamily: 'Outfit', fontWeight: 800 }}>Batch Convert</h3>
          <button className="btn btn-ghost btn-icon-only" style={{ border: 'none' }} onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          <div
            className={`batch-dropzone${isDragOver ? ' dragover' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false); }}
            onDrop={handleDrop}
          >
            <i className="fa-solid fa-cloud-arrow-up batch-dropzone__icon"></i>
            <p className="batch-dropzone__primary">Drop files here or <span className="batch-dropzone__link">click to browse</span></p>
            <p className="batch-dropzone__secondary">PDF, DOCX, PPTX, XLSX, HTML, TXT, ZIP, images, audio and more</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files.length > 0) { onAddFiles(e.target.files); e.target.value = ''; } }}
            />
          </div>

          {files.length > 0 && (
            <div className="batch-file-list" style={{ display: 'block' }}>
              {files.map(bf => {
                const meta = STATUS_META[bf.status] || STATUS_META.queued;
                const pageProgress = bf.status === 'converting' && bf.progress?.total > 1 ? bf.progress : null;
                return (
                  <div key={bf.id}>
                    <div className="batch-file-row">
                      <span className="batch-file-row__name" title={bf.name}>{bf.name}</span>
                      <span className="batch-file-row__size">{formatFileSize(bf.size)}</span>
                      <span className={`batch-status ${meta.cls}`}>
                        <i className={`fa-solid ${meta.icon}`}></i>
                        {pageProgress
                          ? `${pageProgress.current} / ${pageProgress.total} ${pageProgress.unit}`
                          : meta.label}
                      </span>
                      {bf.status === 'done' && (
                        <button className="batch-file-row__download" onClick={() => onDownloadSingle(bf.id)}>
                          <i className="fa-solid fa-download"></i> .MD
                        </button>
                      )}
                      {!isRunning && (
                        <button className="batch-file-row__remove" title="Remove" onClick={() => onRemoveFile(bf.id)}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>
                    {bf.status === 'error' && bf.errorMsg && (
                      <div className="batch-file-row--error-detail">{bf.errorMsg}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isRunning && total > 0 && (
            <div className="batch-progress">
              <div className="batch-progress__header">
                <span className="batch-progress__label">
                  {convertingFile
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Converting <strong>{convertingFile.name}</strong></>
                    : <><i className="fa-solid fa-circle-check"></i> Finishing up...</>
                  }
                </span>
                <span className="batch-progress__count">{processed} / {total}</span>
              </div>
              <div className="batch-progress__track">
                <div className="batch-progress__fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          <div className="batch-action-bar">
            <span className="batch-summary">{summaryParts.join(' · ')}</span>
            <div className="batch-action-bar__buttons">
              <button className="btn btn-primary" disabled={!hasQueued || isRunning} onClick={onConvertAll}>
                <i className="fa-solid fa-bolt"></i><span>Convert All</span>
              </button>
              <button className="btn btn-ghost" disabled={!hasDone} onClick={onDownloadZip}>
                <i className="fa-solid fa-file-zipper"></i><span>Download All as ZIP</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
