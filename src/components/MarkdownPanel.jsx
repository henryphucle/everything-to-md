export default function MarkdownPanel({ markdownRef, onInput, onCopy, onPaste }) {
  return (
    <section className="editor-panel">
      <div className="panel-header">
        <div className="panel-title">
          <i className="fa-brands fa-markdown"></i>
          <span>Markdown Editor</span>
        </div>
        <div className="panel-actions">
          <button className="ai-badge-btn" title="Copy Markdown" onClick={onCopy}>
            <i className="fa-solid fa-copy"></i>
            <span>COPY</span>
          </button>
          <button className="ai-badge-btn" title="Paste Markdown" onClick={onPaste}>
            <i className="fa-solid fa-paste"></i>
            <span>PASTE</span>
          </button>
        </div>
      </div>
      <div className="panel-content">
        <textarea
          ref={markdownRef}
          id="markdown-editor"
          spellCheck="false"
          placeholder="Write markdown here..."
          onInput={onInput}
        />
      </div>
    </section>
  );
}
