export default function LoadingOverlay({ isActive, title, subtitle }) {
  return (
    <div id="loading-overlay" className={`loading-overlay${isActive ? ' active' : ''}`}>
      <div className="loading-content">
        <div className="spinner-container">
          <div className="loader"></div>
        </div>
        <h2 className="loading-title">{title}</h2>
        <p className="loading-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}
