import API_BASE from './apiUrl.js';

export async function convertWithProgress(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/convert-stream`, { method: 'POST', body: formData });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || response.statusText);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const line = chunk.trim();
        if (!line.startsWith('data: ')) continue;

        let data;
        try { data = JSON.parse(line.slice(6)); } catch { continue; }

        if (data.error) throw new Error(data.error);
        if (data.done) return { markdown: data.markdown, filename: data.filename };
        if (data.current !== undefined) onProgress?.(data.current, data.total, data.unit);
      }
    }
  } finally {
    reader.releaseLock();
  }

  throw new Error('Stream ended without a result');
}
