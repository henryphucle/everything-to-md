export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMarkdown(md, filename, showToast) {
  if (!md.trim()) {
    showToast('Nothing to export!', 'fa-circle-exclamation');
    return;
  }
  const name = filename.trim() || 'untitled-document';
  const blob = new Blob([md], { type: 'text/markdown' });
  downloadBlob(blob, `${name}.md`);
  showToast(`Exported as ${name}.md`);
}
