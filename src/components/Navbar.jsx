import { useRef } from 'react';

const ACCEPT = '.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.html,.htm,.csv,.json,.xml,.txt,.zip,.epub,.msg,.jpg,.jpeg,.png,.gif,.bmp,.webp,.wav,.mp3';

export default function Navbar({ filename, onFilenameChange, onExport, liveSyncEnabled, onToggleLiveSync, onImportFile, onOpenBatch, onOpenSettings }) {
  const fileInputRef = useRef(null);

  function handleFilenameKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onExport();
    }
  }

  return (
    <header className="navbar">
      <a href="#" className="brand">
        <div className="brand-icon">
          <i className="fa-solid fa-file-signature"></i>
        </div>
        <h1 className="brand-name">everythingToMD</h1>
      </a>

      <div className="nav-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) { onImportFile(e.target.files[0]); e.target.value = ''; } }}
        />
        <button
          className="btn btn-action"
          title="Import file and convert to Markdown (Max 50MB) — requires local server"
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="fa-solid fa-upload"></i>
          <span>SINGLE IMPORT</span>
        </button>

        <button className="btn btn-action" title="Batch convert multiple files to Markdown" onClick={onOpenBatch}>
          <i className="fa-solid fa-boxes-stacked"></i>
          <span>BATCH CONVERT</span>
        </button>

        <div
          className={`toggle-live-sync${liveSyncEnabled ? ' sync-active' : ''}`}
          title="Sync changes automatically"
          onClick={onToggleLiveSync}
        >
          <span>LIVE SYNC</span>
          <div className="switch"></div>
        </div>

        <div className="export-group">
          <input
            type="text"
            id="filename-input"
            className="filename-input"
            placeholder="filename"
            value={filename}
            onChange={e => onFilenameChange(e.target.value)}
            onKeyDown={handleFilenameKeyDown}
          />
          <span className="file-ext">.MD</span>
          <button className="btn btn-primary" onClick={onExport}>
            <i className="fa-solid fa-cloud-arrow-down"></i>
            <span>Export</span>
          </button>
        </div>

        <button className="btn btn-ghost btn-icon-only" title="Settings" onClick={onOpenSettings}>
          <i className="fa-solid fa-cog"></i>
        </button>
      </div>
    </header>
  );
}
