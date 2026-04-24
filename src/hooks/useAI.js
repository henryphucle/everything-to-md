import { fixHTMLForQuill } from '../lib/htmlUtils.js';

async function generateAIContent(prompt, systemInstruction, showToast, openSettings) {
  const key = localStorage.getItem('everythingtomd_gemini_key') || '';
  if (!key) {
    showToast('Missing Gemini API Key! Check Settings.', 'fa-circle-exclamation');
    openSettings();
    return '';
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
        }),
      }
    );
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    console.error(err);
    showToast('AI Request Failed', 'fa-circle-exclamation');
    return '';
  }
}

export function useAI({ showToast, setLoading, openSettings }) {
  async function handlePolish(quill, saveToLocal) {
    const html = quill.root.innerHTML;
    if (!quill.getText().trim()) {
      showToast('Nothing to polish!', 'fa-circle-exclamation');
      return;
    }

    setLoading(true, 'AI Polishing', 'Gemini is improving your text for clarity and grammar...');

    const prompt = `Polish this HTML content for clarity and grammar. Return ONLY valid HTML.\n\n${html}`;
    const system = 'You are a professional editor. Output only clean, valid HTML matching the input\'s structure.';
    const result = await generateAIContent(prompt, system, showToast, openSettings);

    if (result) {
      const clean = result.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
      quill.clipboard.dangerouslyPasteHTML(fixHTMLForQuill(clean));
      saveToLocal();
      showToast('AI Polish Applied');
    }

    setLoading(false);
  }

  async function handleSummarize(quill, saveToLocal) {
    const text = quill.getText().trim();
    if (!text) {
      showToast('Nothing to summarize!', 'fa-circle-exclamation');
      return;
    }

    setLoading(true, 'AI Summarizing', 'Gemini is creating a summary of your content...');

    const prompt = `Summarize this content as a short HTML paragraph starting with '✨ AI Summary:'.\n\n${text}`;
    const system = 'Output ONLY a single HTML paragraph (<p>...).';
    const result = await generateAIContent(prompt, system, showToast, openSettings);

    if (result) {
      const clean = result.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
      quill.clipboard.dangerouslyPasteHTML(fixHTMLForQuill(clean) + '<br>' + quill.root.innerHTML);
      saveToLocal();
      showToast('AI Summary Added');
    }

    setLoading(false);
  }

  return { handlePolish, handleSummarize };
}
