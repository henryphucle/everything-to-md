export default function CenterControls({ onConvertToMd, onConvertToRt }) {
  return (
    <section className="center-controls">
      <button id="convert-to-md" className="convert-btn" title="Convert to Markdown" onClick={onConvertToMd}>
        <i className="fa-solid fa-arrow-right"></i>
      </button>
      <button id="convert-to-rt" className="convert-btn" title="Convert to Rich Text" onClick={onConvertToRt}>
        <i className="fa-solid fa-arrow-left"></i>
      </button>
    </section>
  );
}
