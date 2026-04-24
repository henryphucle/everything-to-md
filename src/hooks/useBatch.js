import { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { downloadBlob } from '../lib/fileUtils.js';
import { convertWithProgress } from '../lib/convertWithProgress.js';

function makeBatchFile(file) {
  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    size: file.size,
    status: 'queued',
    markdown: '',
    errorMsg: '',
    progress: null, // { current, total, unit } while converting
  };
}

export function useBatch(showToast) {
  const [files, setFiles] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const filesRef = useRef([]);

  const updateFiles = useCallback((updater) => {
    setFiles(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      filesRef.current = next;
      return next;
    });
  }, []);

  const addFiles = useCallback((fileList) => {
    // Convert to array immediately — FileList is a live view that clears when
    // the input value is reset, and setFiles updaters run asynchronously.
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    updateFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const newItems = incoming
        .filter(f => !existingNames.has(f.name))
        .map(f => makeBatchFile(f));
      return newItems.length > 0 ? [...prev, ...newItems] : prev;
    });

    // showToast must be called outside the functional updater (StrictMode calls updaters twice)
    showToast(`${incoming.length} file${incoming.length !== 1 ? 's' : ''} added`, 'fa-layer-group');
  }, [updateFiles, showToast]);

  const convertAll = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);

    const toProcess = filesRef.current.filter(f => f.status === 'queued');

    for (const bf of toProcess) {
      updateFiles(prev => prev.map(f => f.id === bf.id ? { ...f, status: 'converting', progress: null } : f));
      try {
        const { markdown } = await convertWithProgress(bf.file, (current, total, unit) => {
          if (total > 1) {
            updateFiles(prev => prev.map(f =>
              f.id === bf.id ? { ...f, progress: { current, total, unit } } : f
            ));
          }
        });
        updateFiles(prev => prev.map(f => f.id === bf.id ? { ...f, status: 'done', markdown, progress: null } : f));
      } catch (err) {
        updateFiles(prev => prev.map(f =>
          f.id === bf.id ? { ...f, status: 'error', errorMsg: err.message || 'Conversion failed', progress: null } : f
        ));
      }
    }

    setIsRunning(false);
    const final = filesRef.current;
    const done = final.filter(f => f.status === 'done').length;
    const errors = final.filter(f => f.status === 'error').length;
    showToast(
      errors === 0 ? `All ${done} files converted` : `${done} done, ${errors} failed`,
      errors === 0 ? 'fa-circle-check' : 'fa-circle-exclamation'
    );
  }, [isRunning, updateFiles, showToast]);

  const downloadSingle = useCallback((id) => {
    const bf = filesRef.current.find(f => f.id === id);
    if (!bf || bf.status !== 'done') return;
    const baseName = bf.name.replace(/\.[^/.]+$/, '');
    downloadBlob(new Blob([bf.markdown], { type: 'text/markdown' }), `${baseName}.md`);
  }, []);

  const downloadZip = useCallback(async () => {
    const doneFiles = filesRef.current.filter(f => f.status === 'done');
    if (!doneFiles.length) return;
    const zip = new JSZip();
    doneFiles.forEach(bf => zip.file(`${bf.name.replace(/\.[^/.]+$/, '')}.md`, bf.markdown));
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'batch-convert.zip');
    showToast(`${doneFiles.length} files zipped`, 'fa-file-zipper');
  }, [showToast]);

  const removeFile = useCallback((id) => {
    updateFiles(prev => prev.filter(f => f.id !== id));
  }, [updateFiles]);

  const clearFiles = useCallback(() => {
    updateFiles([]);
    setIsRunning(false);
  }, [updateFiles]);

  return { files, isRunning, addFiles, convertAll, downloadSingle, downloadZip, removeFile, clearFiles };
}
