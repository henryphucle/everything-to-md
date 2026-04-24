import QuillEditor from './QuillEditor.jsx';

export default function RichTextPanel({ onQuillReady, onQuillChange, onCopy, onPaste, onPolish, onSummarize, onClear }) {
  return (
    <section className="editor-panel">
      <div className="panel-header">
        <div className="panel-title">
          <i className="fa-solid fa-paragraph"></i>
          <span>Rich Text Editor</span>
        </div>
        <div className="panel-actions">
          <button className="ai-badge-btn" title="Copy Rich Text" onClick={onCopy}>
            <i className="fa-solid fa-copy"></i>
            <span>COPY</span>
          </button>
          <button className="ai-badge-btn" title="Paste Rich Text" onClick={onPaste}>
            <i className="fa-solid fa-paste"></i>
            <span>PASTE</span>
          </button>
          <button className="ai-badge-btn btn-polish" title="AI Polish" onClick={onPolish}>
            <i className="fa-solid fa-sparkles"></i>
            <span>POLISH</span>
          </button>
          <button className="ai-badge-btn btn-summarize" title="AI Summarize" onClick={onSummarize}>
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>SUMMARIZE</span>
          </button>
          <button className="btn btn-ghost btn-clear" title="Clear Canvas" onClick={onClear}>
            <i className="fa-solid fa-eraser"></i>
          </button>
        </div>
      </div>
      <div className="panel-content">
        <QuillEditor onChange={onQuillChange} onReady={onQuillReady} />
      </div>
    </section>
  );
}
