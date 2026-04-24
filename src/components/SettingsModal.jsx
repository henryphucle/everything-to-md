import { useState, useEffect } from 'react';

export default function SettingsModal({ isOpen, onClose, onSave }) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) setApiKey(localStorage.getItem('everythingtomd_gemini_key') || '');
  }, [isOpen]);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSave() {
    onSave(apiKey.trim());
    onClose();
  }

  return (
    <div
      id="settings-modal"
      className={`modal-overlay${isOpen ? ' active' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="modal-container">
        <div className="modal-header">
          <h3 style={{ fontFamily: 'Outfit', fontWeight: 800 }}>Application Settings</h3>
          <button className="btn btn-ghost btn-icon-only" style={{ border: 'none' }} onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="setting-item" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="api-key-input" style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
              Gemini API Key
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: '1rem' }}>
              Stored locally in your browser. Never shared.
            </p>
            <input
              type="password"
              id="api-key-input"
              className="filename-input"
              style={{ width: '100%', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem' }}
              placeholder="Paste your API key here"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave}>
              Save Configuration
            </button>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--slate-100)' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--slate-800)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fa-solid fa-shield-halved" style={{ color: 'var(--success)' }}></i> Privacy &amp; Data Policy
            </h4>
            <p style={{ fontSize: '0.7rem', color: 'var(--slate-600)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              Your Gemini API key is stored locally in your browser's <code>localStorage</code>. It is <strong>never transmitted</strong> to any server other than directly to Google's Generative AI API.
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
              File imports are processed by a local Python server running on your own machine via <strong>markitdown</strong>. Your files never leave your device.
            </p>
          </div>

          <p style={{ fontSize: '0.7rem', color: 'var(--slate-400)', textAlign: 'center', marginTop: '1.5rem' }}>
            Don't have a key?{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
              Get one for free
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
