import { useRef, useState, useCallback } from 'react';
import { marked } from 'marked';

import Navbar from './components/Navbar.jsx';
import RichTextPanel from './components/RichTextPanel.jsx';
import MarkdownPanel from './components/MarkdownPanel.jsx';
import CenterControls from './components/CenterControls.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import BatchModal from './components/BatchModal.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import Toast from './components/Toast.jsx';

import { useToast } from './hooks/useToast.js';
import { useConversion } from './hooks/useConversion.js';
import { useAI } from './hooks/useAI.js';
import { useBatch } from './hooks/useBatch.js';
import { fixHTMLForQuill } from './lib/htmlUtils.js';
import { exportMarkdown } from './lib/fileUtils.js';
import { convertWithProgress } from './lib/convertWithProgress.js';

const APP_VERSION = '1.0.0';

export default function App() {
  // Quill instance stored in a ref (imperative)
  const quillInstanceRef = useRef(null);
  // Uncontrolled markdown textarea
  const markdownRef = useRef(null);

  // Sync guard flags — must be refs to avoid re-render loops
  const isSyncingFromRT = useRef(false);
  const isSyncingFromMD = useRef(false);
  const syncTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  // Keep a ref mirror of liveSyncEnabled for use inside Quill's text-change handler
  const liveSyncRef = useRef(false);

  const [filename, setFilename] = useState('everythingtomd-export');
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [loading, setLoadingState] = useState({ active: false, title: '', subtitle: '' });

  const { toast, showToast } = useToast();
  const { syncRTtoMD, syncMDtoRT } = useConversion();

  function setLoading(active, title = '', subtitle = '') {
    setLoadingState({ active, title, subtitle });
  }

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);

  const { handlePolish, handleSummarize } = useAI({ showToast, setLoading, openSettings });
  const { files: batchFiles, isRunning: batchRunning, addFiles, convertAll, downloadSingle, downloadZip, removeFile, clearFiles } = useBatch(showToast);

  // Debounced localStorage save
  const saveToLocal = useCallback(() => {
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const q = quillInstanceRef.current;
      if (q) localStorage.setItem('everythingtomd_rt', q.root.innerHTML);
      if (markdownRef.current) localStorage.setItem('everythingtomd_md', markdownRef.current.value);
      localStorage.setItem('everythingtomd_filename', filename);
    }, 1000);
  }, [filename]);

  // Called once when Quill mounts — safe to load localStorage here
  const handleQuillReady = useCallback((q) => {
    quillInstanceRef.current = q;

    const cachedRT = localStorage.getItem('everythingtomd_rt');
    const cachedMD = localStorage.getItem('everythingtomd_md');
    const cachedFilename = localStorage.getItem('everythingtomd_filename');
    const savedSync = localStorage.getItem('everythingtomd_sync') === 'true';

    if (cachedRT) {
      isSyncingFromMD.current = true;
      q.clipboard.dangerouslyPasteHTML(cachedRT);
      isSyncingFromMD.current = false;
    }
    if (cachedMD && markdownRef.current) {
      markdownRef.current.value = cachedMD;
    }
    if (cachedFilename) setFilename(cachedFilename);
    if (savedSync) {
      setLiveSyncEnabled(true);
      liveSyncRef.current = true;
    }
  }, []);

  // Quill text-change handler
  const handleRTChange = useCallback((html) => {
    if (isSyncingFromMD.current) return;
    saveToLocal();
    if (liveSyncRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        const q = quillInstanceRef.current;
        if (!q) return;
        isSyncingFromRT.current = true;
        const md = syncRTtoMD(q);
        if (markdownRef.current) markdownRef.current.value = md;
        isSyncingFromRT.current = false;
      }, 500);
    }
  }, [saveToLocal, syncRTtoMD]);

  // Markdown textarea input handler
  const handleMDChange = useCallback(() => {
    if (isSyncingFromRT.current) return;
    saveToLocal();
    if (liveSyncRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        const q = quillInstanceRef.current;
        const md = markdownRef.current?.value || '';
        if (!q) return;
        isSyncingFromMD.current = true;
        const html = syncMDtoRT(md);
        q.clipboard.dangerouslyPasteHTML(html);
        isSyncingFromMD.current = false;
      }, 500);
    }
  }, [saveToLocal, syncMDtoRT]);

  // Manual convert buttons
  const handleConvertToMD = useCallback(() => {
    const q = quillInstanceRef.current;
    if (!q) return;
    const md = syncRTtoMD(q);
    if (markdownRef.current) markdownRef.current.value = md;
    saveToLocal();
    showToast('Converted to Markdown');
  }, [syncRTtoMD, saveToLocal, showToast]);

  const handleConvertToRT = useCallback(() => {
    const q = quillInstanceRef.current;
    const md = markdownRef.current?.value || '';
    if (!q) return;
    isSyncingFromRT.current = true;
    q.clipboard.dangerouslyPasteHTML(syncMDtoRT(md));
    isSyncingFromRT.current = false;
    saveToLocal();
    showToast('Converted to Rich Text');
  }, [syncMDtoRT, saveToLocal, showToast]);

  // Live sync toggle
  const handleToggleLiveSync = useCallback(() => {
    setLiveSyncEnabled(prev => {
      const next = !prev;
      liveSyncRef.current = next;
      localStorage.setItem('everythingtomd_sync', next);
      if (next) {
        showToast('Live Sync Enabled', 'fa-rotate');
        const q = quillInstanceRef.current;
        if (q) {
          isSyncingFromRT.current = true;
          const md = syncRTtoMD(q);
          if (markdownRef.current) markdownRef.current.value = md;
          isSyncingFromRT.current = false;
        }
      } else {
        showToast('Live Sync Disabled', 'fa-toggle-off');
      }
      return next;
    });
  }, [showToast, syncRTtoMD]);

  // Clipboard
  const handleRTCopy = useCallback(async () => {
    const q = quillInstanceRef.current;
    if (!q) return;
    const html = q.root.innerHTML;
    const plain = q.getText();
    try {
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([plain], { type: 'text/plain' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })]);
      showToast('Rich Text Copied to Clipboard');
    } catch {
      await navigator.clipboard.writeText(plain);
      showToast('Text Copied (HTML export failed)', 'fa-circle-exclamation');
    }
  }, [showToast]);

  const handleRTPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return showToast('Clipboard is empty!', 'fa-circle-exclamation');
      const q = quillInstanceRef.current;
      if (!q) return;
      if (text.includes('<') && text.includes('>')) {
        q.clipboard.dangerouslyPasteHTML(text);
      } else {
        q.insertText(q.getSelection()?.index || 0, text);
      }
      showToast('Pasted into Rich Text');
    } catch {
      showToast('Paste Failed: Check browser permissions', 'fa-circle-exclamation');
    }
  }, [showToast]);

  const handleMDCopy = useCallback(async () => {
    const md = markdownRef.current?.value || '';
    if (!md.trim()) return showToast('Nothing to copy!', 'fa-circle-exclamation');
    await navigator.clipboard.writeText(md);
    showToast('Markdown Copied to Clipboard');
  }, [showToast]);

  const handleMDPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return showToast('Clipboard is empty!', 'fa-circle-exclamation');
      const ta = markdownRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.substring(0, start) + text + ta.value.substring(end);
      ta.selectionStart = ta.selectionEnd = start + text.length;
      handleMDChange();
      showToast('Pasted into Markdown');
    } catch {
      showToast('Paste Failed: Check browser permissions', 'fa-circle-exclamation');
    }
  }, [showToast, handleMDChange]);

  // AI actions
  const handlePolishClick = useCallback(() => {
    const q = quillInstanceRef.current;
    if (q) handlePolish(q, saveToLocal);
  }, [handlePolish, saveToLocal]);

  const handleSummarizeClick = useCallback(() => {
    const q = quillInstanceRef.current;
    if (q) handleSummarize(q, saveToLocal);
  }, [handleSummarize, saveToLocal]);

  // Clear both editors
  const handleClear = useCallback(() => {
    if (!confirm('Are you sure you want to clear both editors?')) return;
    const q = quillInstanceRef.current;
    if (q) q.root.innerHTML = '';
    if (markdownRef.current) markdownRef.current.value = '';
    saveToLocal();
    showToast('Editors cleared', 'fa-eraser');
  }, [saveToLocal, showToast]);

  // Export
  const handleExport = useCallback(() => {
    const md = markdownRef.current?.value || '';
    exportMarkdown(md, filename, showToast);
  }, [filename, showToast]);

  // Settings save
  const handleSettingsSave = useCallback((key) => {
    localStorage.setItem('everythingtomd_gemini_key', key);
    showToast('Settings Saved Locally');
  }, [showToast]);

  // Single file import
  const handleImportFile = useCallback(async (file) => {
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('File is too large! Maximum size is 50MB.', 'fa-circle-exclamation');
      return;
    }

    setLoading(true, 'Converting File', `Sending ${file.name} to local server...`);

    try {
      const { markdown: md } = await convertWithProgress(file, (current, total, unit) => {
        const subtitle = total > 1
          ? `Processing ${unit === 'pages' ? 'page' : 'part'} ${current} of ${total}...`
          : 'Processing file...';
        setLoading(true, 'Converting File', subtitle);
      });

      const q = quillInstanceRef.current;
      if (q) {
        const html = fixHTMLForQuill(marked.parse(md));
        isSyncingFromMD.current = true;
        q.clipboard.dangerouslyPasteHTML(html);
        isSyncingFromMD.current = false;
      }
      if (markdownRef.current) markdownRef.current.value = md;
      saveToLocal();

      setLoading(true, 'All Set!', 'Your content has been imported to the editor.');
      setTimeout(() => {
        setLoading(false);
        showToast(`${file.name} imported`);
      }, 800);
    } catch (err) {
      console.error(err);
      showToast(`Import failed: ${err.message}`, 'fa-circle-exclamation');
      setLoading(false);
    }
  }, [showToast, saveToLocal]);

  // Batch modal close — clears files
  const handleCloseBatch = useCallback(() => {
    clearFiles();
    setIsBatchOpen(false);
  }, [clearFiles]);

  return (
    <div className="app-container">
      <Navbar
        filename={filename}
        onFilenameChange={setFilename}
        onExport={handleExport}
        liveSyncEnabled={liveSyncEnabled}
        onToggleLiveSync={handleToggleLiveSync}
        onImportFile={handleImportFile}
        onOpenBatch={() => setIsBatchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="main-workspace">
        <RichTextPanel
          onQuillReady={handleQuillReady}
          onQuillChange={handleRTChange}
          onCopy={handleRTCopy}
          onPaste={handleRTPaste}
          onPolish={handlePolishClick}
          onSummarize={handleSummarizeClick}
          onClear={handleClear}
        />
        <CenterControls onConvertToMd={handleConvertToMD} onConvertToRt={handleConvertToRT} />
        <MarkdownPanel
          markdownRef={markdownRef}
          onInput={handleMDChange}
          onCopy={handleMDCopy}
          onPaste={handleMDPaste}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSettingsSave}
      />

      <BatchModal
        isOpen={isBatchOpen}
        onClose={handleCloseBatch}
        files={batchFiles}
        onAddFiles={addFiles}
        onConvertAll={convertAll}
        onDownloadZip={downloadZip}
        onDownloadSingle={downloadSingle}
        onRemoveFile={removeFile}
        isRunning={batchRunning}
      />

      <footer style={{ background: 'var(--white)', borderTop: '1px solid var(--slate-200)', padding: '0.75rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--slate-400)' }}>
        &copy; 2026 everythingToMD &bull; All processing stays on your machine &bull;{' '}
        <span
          style={{ cursor: 'pointer', color: 'var(--primary-600)', fontWeight: 600 }}
          onClick={() => setIsSettingsOpen(true)}
        >
          View Security Policy
        </span>
        {' '}&bull; <span id="app-version">v{APP_VERSION}</span>
      </footer>

      <LoadingOverlay isActive={loading.active} title={loading.title} subtitle={loading.subtitle} />
      <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
    </div>
  );
}
