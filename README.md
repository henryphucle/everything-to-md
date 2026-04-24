# ✍️ everythingToMD: Premium Rich Text & Markdown Editor

**everythingToMD** is a modern, high-performance web tool for converting anything into Markdown — rich text, PDFs, Word docs, spreadsheets, images, audio, and more. Built with React + Vite, it features real-time bidirectional editing, batch file conversion, and AI capabilities powered by Google Gemini.

![Status](https://img.shields.io/badge/Status-Ready%20to%20Deploy-success)
![React](https://img.shields.io/badge/Made%20with-React%20%2B%20Vite-61DAFB)
![Privacy](https://img.shields.io/badge/Privacy-Local%20Storage-blueviolet)

---

## ✨ Key Features

- 🔄 **Bidirectional Sync**: Convert Rich Text to Markdown (and vice versa) in real-time with optional Live Sync.
- 📦 **Batch Convert**: Drop multiple files at once and download the results as a ZIP.
- 🪄 **AI Polish**: Refine your writing for clarity, grammar, and style with Google Gemini.
- 📝 **AI Summarize**: Summarize long documents into a single paragraph instantly.
- 📄 **File Import**: Upload PDFs, Word docs, Excel sheets, PowerPoints, HTML, images, audio, and more — converted to clean Markdown via a local Python server.
- 📥 **One-Click Export**: Save your work directly as a `.md` file.
- 🔒 **Privacy-First**: Your API key and content are stored locally in your browser. Nothing leaves your machine except direct calls to the Gemini API.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+) — for the React frontend
- **Python 3.9+** — for the local file conversion server
- A free **Gemini API key** for AI features → [Google AI Studio](https://aistudio.google.com/app/apikey)

### Install & Run

**1. Install frontend dependencies**
```bash
npm install
```

**2. Install Python dependencies**
```bash
pip install -r requirements.txt
```

**3. Start the local conversion server**
```bash
python server.py
```
The API runs at `http://localhost:8000`.

**4. Start the dev server** (in a separate terminal)
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

> **Note:** The Python server is only required for file import and batch convert. The editor and AI features work without it.

### Production Build

```bash
npm run build
python server.py
```
The built app is served by FastAPI at `http://localhost:8000`.

---

## 🛠️ Built With

| Layer | Technology |
|---|---|
| UI Framework | [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/) |
| Rich Text Editor | [Quill.js 2](https://quilljs.com/) |
| HTML → Markdown | [Turndown](https://github.com/mixmark-io/turndown) + [GFM plugin](https://github.com/mixmark-io/turndown-plugin-gfm) |
| Markdown → HTML | [Marked](https://marked.js.org/) |
| File Conversion | [MarkItDown](https://github.com/microsoft/markitdown) (Python, local) |
| AI Features | [Google Gemini API](https://ai.google.dev/) |
| Backend | [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/) |
| Batch Download | [JSZip](https://stuk.github.io/jszip/) |

---

## 🛡️ Privacy

All content and API keys are stored in your browser's `localStorage`. No data is collected or sent to third-party servers, except direct requests to Google's Gemini API for AI features. File imports are processed by a local Python server running on your own machine — your files never leave your device.
