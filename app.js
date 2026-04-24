/**
 * richtexttomd - Modern Rich Text to Markdown Logic
 * Features:
 * - Real-time sync (optional)
 * - Turndown integration for HTML -> MD
 * - Marked integration for MD -> HTML
 * - LocalStorage persistence
 * - Premium Toast notifications
 */

// App Configuration
const APP_VERSION = '1.0.0';

// State Management
const STATE = {
    isSyncingFromRT: false,
    isSyncingFromMD: false,
    liveSyncEnabled: false,
    saveTimeout: null,
    syncTimeout: null,
    batch: { files: [], isRunning: false }
};

// --- DOM Elements ---
let DOM = {};

function initDOM() {
    DOM = {
        appVersion: document.getElementById('app-version'),
        editor: document.getElementById('editor'),
        markdownInput: document.getElementById('markdown-editor'),
        convertToMdBtn: document.getElementById('convert-to-md'),
        convertToRtBtn: document.getElementById('convert-to-rt'),
        exportBtn: document.getElementById('export-btn'),
        filenameInput: document.getElementById('filename-input'),
        liveSyncToggle: document.getElementById('live-sync-toggle'),
        aiPolishBtn: document.getElementById('ai-polish-btn'),
        aiSummarizeBtn: document.getElementById('ai-summarize-btn'),
        settingsBtn: document.getElementById('settings-btn'),
        settingsModal: document.getElementById('settings-modal'),
        closeSettings: document.getElementById('close-settings'),
        saveSettings: document.getElementById('save-settings'),
        apiKeyInput: document.getElementById('api-key-input'),
        toast: document.getElementById('toast'),
        toastMsg: document.getElementById('toast-msg'),
        toastIcon: document.getElementById('toast-icon'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingTitle: document.querySelector('.loading-title'),
        loadingSubtitle: document.querySelector('.loading-subtitle'),
        rtCopyBtn: document.getElementById('rt-copy-btn'),
        rtPasteBtn: document.getElementById('rt-paste-btn'),
        mdCopyBtn: document.getElementById('md-copy-btn'),
        mdPasteBtn: document.getElementById('md-paste-btn'),
        batchConvertBtn:     document.getElementById('batch-convert-btn'),
        batchModal:          document.getElementById('batch-modal'),
        closeBatchModalBtn:  document.getElementById('close-batch-modal'),
        batchDropzone:       document.getElementById('batch-dropzone'),
        batchFileInput:      document.getElementById('batch-file-input'),
        batchConvertAllBtn:  document.getElementById('batch-convert-all-btn'),
        batchDownloadZipBtn: document.getElementById('batch-download-zip-btn'),
    };
}

function getApiKey() {
    return localStorage.getItem('richtexttomd_gemini_key') || "";
}

// --- Library Setup ---
let quill;
let turndownService;

function initQuill() {
    // Register a custom icon for table deletion
    const icons = Quill.import('ui/icons');
    icons['table-delete'] = '<i class="fa-solid fa-trash-can" style="font-size: 14px;"></i>';

    quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: 'Start writing your rich text...',
        modules: {
            table: true, // Enabled table module in v2
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['link', 'table', 'table-delete', 'clean'] // Added table-delete
                ],
                handlers: {
                    'table-delete': function() {
                        const tableModule = quill.getModule('table');
                        if (tableModule) {
                            tableModule.deleteTable();
                        }
                    }
                }
            }
        }
    });

    // Add a tooltip to our custom button
    const deleteBtn = document.querySelector('.ql-table-delete');
    if (deleteBtn) {
        deleteBtn.setAttribute('title', 'Delete Table');
    }

    quill.on('text-change', () => {
        handleRTChange();
    });
}

function initTurndown() {
    turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*'
    });
    
    // Add Github Flavored Markdown (GFM) support for tables, task lists, etc.
    if (typeof turndownPluginGfm !== 'undefined') {
        turndownService.use(turndownPluginGfm.gfm);
    }
}

// --- Core Logic ---

function showToast(message, iconClass = 'fa-circle-check') {
    DOM.toastMsg.innerText = message;
    DOM.toastIcon.className = `fa-solid ${iconClass} toast-icon`;
    DOM.toast.classList.add('visible');

    setTimeout(() => {
        DOM.toast.classList.remove('visible');
    }, 3000);
}

function handleRTChange() {
    if (STATE.isSyncingFromMD) return;

    saveToLocal();

    if (STATE.liveSyncEnabled) {
        clearTimeout(STATE.syncTimeout);
        STATE.syncTimeout = setTimeout(() => {
            syncRTtoMD();
        }, 500);
    }
}

function handleMDChange() {
    if (STATE.isSyncingFromRT) return;

    saveToLocal();

    if (STATE.liveSyncEnabled) {
        clearTimeout(STATE.syncTimeout);
        STATE.syncTimeout = setTimeout(() => {
            syncMDtoRT();
        }, 500);
    }
}

function syncRTtoMD() {
    if (STATE.isSyncingFromMD) return;
    STATE.isSyncingFromRT = true;

    // Get a clone of the editor's content to manipulate safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = quill.root.innerHTML;
    
    // Convert Quill's flat list structure and handle tables for GFM compatibility
    prepareHTMLForMarkdown(tempDiv);
    
    const md = turndownService.turndown(tempDiv.innerHTML);
    DOM.markdownInput.value = md;

    STATE.isSyncingFromRT = false;
    console.log('RT -> MD Synced');
}

/**
 * Transforms Quill's flat list structure into standard nested HTML (ol/ul > li > ol/ul > li).
 * This allows Turndown to perceive the nesting and generate correct indented Markdown.
 */
/**
 * Prepares Quill-generated HTML for cleaner Markdown conversion.
 * - Transforms flat list structure into standard nested HTML.
 * - Converts the first row of tables to header rows (th) for GFM compatibility.
 */
function prepareHTMLForMarkdown(container) {
    // 1. Handle Lists
    const lists = container.querySelectorAll('ol, ul');
    lists.forEach(originalList => {
        const items = Array.from(originalList.querySelectorAll(':scope > li'));
        if (items.length === 0) return;
        
        const newRoot = document.createElement(originalList.tagName);
        let stack = [{ level: 0, list: newRoot }];
        
        items.forEach(item => {
            const match = item.className.match(/ql-indent-(\d+)/);
            const level = match ? parseInt(match[1], 10) : 0;
            
            while (stack.length > 1 && level < stack[stack.length - 1].level) {
                stack.pop();
            }
            
            if (level > stack[stack.length - 1].level) {
                const lastLi = stack[stack.length - 1].list.lastElementChild;
                if (lastLi) {
                    const subList = document.createElement(originalList.tagName);
                    lastLi.appendChild(subList);
                    stack.push({ level: level, list: subList });
                }
            }
            
            const itemClone = item.cloneNode(true);
            const classesToRemove = Array.from(itemClone.classList).filter(c => c.startsWith('ql-indent-'));
            if (classesToRemove.length > 0) {
                itemClone.classList.remove(...classesToRemove);
            }
            if (itemClone.classList.length === 0) {
                itemClone.removeAttribute('class');
            }
            
            stack[stack.length - 1].list.appendChild(itemClone);
        });
        
        originalList.replaceWith(newRoot);
    });

    // 2. Handle Tables (GFM requires <th> in the first row to detect a table)
    const tables = container.getElementsByTagName('table');
    for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const rows = table.getElementsByTagName('tr');
        if (rows.length > 0) {
            const firstRow = rows[0];
            const cells = Array.from(firstRow.getElementsByTagName('td'));
            cells.forEach(td => {
                const th = document.createElement('th');
                th.innerHTML = td.innerHTML;
                // Copy over attributes (important for Quill's data-row identifiers)
                for (let k = 0; k < td.attributes.length; k++) {
                    const attr = td.attributes[k];
                    th.setAttribute(attr.name, attr.value);
                }
                if (td.parentNode) {
                    td.parentNode.replaceChild(th, td);
                }
            });
        }
    }
}

/**
 * Standardizes HTML (from Marked or AI) to ensure it plays nicely with Quill 2.0.
 * - Collapses <thead> into <tbody> for tables.
 * - Converts <th> to <td> to avoid fragmentation.
 */
function fixHTMLForQuill(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
        let thead = table.querySelector('thead');
        let tbody = table.querySelector('tbody');
        
        if (thead) {
            if (!tbody) {
                tbody = document.createElement('tbody');
                table.appendChild(tbody);
            }
            const headRows = Array.from(thead.querySelectorAll('tr'));
            headRows.reverse().forEach(row => {
                tbody.prepend(row);
            });
            thead.remove();
        }

        const ths = table.querySelectorAll('th');
        ths.forEach(th => {
            const td = document.createElement('td');
            td.innerHTML = th.innerHTML;
            if (th.className) td.className = th.className;
            th.replaceWith(td);
        });

        // Aggressively remove whitespace-only text nodes within the table to avoid Quill fragmentation
        const cleanWhitespace = (node) => {
            const children = Array.from(node.childNodes);
            children.forEach(child => {
                if (child.nodeType === 3 && !child.textContent.trim()) {
                    child.remove();
                } else if (child.nodeType === 1) {
                    cleanWhitespace(child);
                }
            });
        };
        cleanWhitespace(table);
    });

    return doc.body.innerHTML;
}

function syncMDtoRT() {
    if (STATE.isSyncingFromRT) return;
    STATE.isSyncingFromMD = true;

    const md = DOM.markdownInput.value;
    let html = marked.parse(md);
    
    // Standardize HTML (tables, etc.) for better Quill 2.0 compatibility
    html = fixHTMLForQuill(html);
    
    quill.clipboard.dangerouslyPasteHTML(html);

    STATE.isSyncingFromMD = false;
    console.log('MD -> RT Synced');
}

function saveToLocal() {
    clearTimeout(STATE.saveTimeout);
    STATE.saveTimeout = setTimeout(() => {
        localStorage.setItem('richtexttomd_rt', quill.root.innerHTML);
        localStorage.setItem('richtexttomd_md', DOM.markdownInput.value);
        localStorage.setItem('richtexttomd_filename', DOM.filenameInput.value);
    }, 1000);
}

function loadFromLocal() {
    const cachedRT = localStorage.getItem('richtexttomd_rt');
    const cachedMD = localStorage.getItem('richtexttomd_md');
    const cachedFilename = localStorage.getItem('richtexttomd_filename');

    if (cachedRT) {
        STATE.isSyncingFromMD = true;
        quill.clipboard.dangerouslyPasteHTML(cachedRT);
        STATE.isSyncingFromMD = false;
    }
    if (cachedMD) {
        DOM.markdownInput.value = cachedMD;
    }
    if (cachedFilename) {
        DOM.filenameInput.value = cachedFilename;
    }
}

function exportMarkdown() {
    const md = DOM.markdownInput.value;
    if (!md.trim()) {
        showToast('Nothing to export!', 'fa-circle-exclamation');
        return;
    }

    const filename = DOM.filenameInput.value.trim() || 'untitled-document';
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    a.click();

    URL.revokeObjectURL(url);
    showToast(`Exported as ${filename}.md`);
}

async function generateAIContent(prompt, systemInstruction) {
    const key = getApiKey();
    if (!key) {
        showToast("Missing Gemini API Key! Check Settings.", "fa-circle-exclamation");
        DOM.settingsModal.classList.add('active');
        return "";
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] }
            })
        });
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
        console.error(err);
        showToast("AI Request Failed", "fa-circle-exclamation");
        return "";
    }
}

// --- Clipboard Handlers ---

async function handleCopy(type) {
    let content = "";
    if (type === 'rt') {
        content = quill.root.innerHTML;
        // For RT, we also want plain text fallback
        const plain = quill.getText();
        
        try {
            const blobHtml = new Blob([content], { type: 'text/html' });
            const blobText = new Blob([plain], { type: 'text/plain' });
            const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
            await navigator.clipboard.write(data);
            showToast("Rich Text Copied to Clipboard");
        } catch (err) {
            // Fallback to text-only if ClipboardItem fails
            await navigator.clipboard.writeText(plain);
            showToast("Text Copied (HTML export failed)", "fa-circle-exclamation");
        }
    } else {
        content = DOM.markdownInput.value;
        if (!content.trim()) return showToast("Nothing to copy!", "fa-circle-exclamation");
        await navigator.clipboard.writeText(content);
        showToast("Markdown Copied to Clipboard");
    }
}

async function handlePaste(type) {
    try {
        const text = await navigator.clipboard.readText();
        if (!text) return showToast("Clipboard is empty!", "fa-circle-exclamation");
        
        if (type === 'rt') {
            // Determine if it's likely HTML
            if (text.includes('<') && text.includes('>')) {
                quill.clipboard.dangerouslyPasteHTML(text);
            } else {
                quill.insertText(quill.getSelection()?.index || 0, text);
            }
            showToast("Pasted into Rich Text");
        } else {
            const start = DOM.markdownInput.selectionStart;
            const end = DOM.markdownInput.selectionEnd;
            const current = DOM.markdownInput.value;
            DOM.markdownInput.value = current.substring(0, start) + text + current.substring(end);
            DOM.markdownInput.selectionStart = DOM.markdownInput.selectionEnd = start + text.length;
            handleMDChange();
            showToast("Pasted into Markdown");
        }
    } catch (err) {
        console.error(err);
        showToast("Paste Failed: Check browser permissions", "fa-circle-exclamation");
    }
}

async function handleAIPolish() {
    const html = quill.root.innerHTML;
    if (!quill.getText().trim()) return showToast("Nothing to polish!", "fa-circle-exclamation");

    DOM.aiPolishBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> POLISHING...';
    DOM.aiPolishBtn.disabled = true;
    DOM.loadingOverlay.classList.add('active');
    document.querySelector('.loading-title').innerText = "AI Polishing";
    document.querySelector('.loading-subtitle').innerText = "Gemini is improving your text for clarity and grammar...";

    const prompt = `Polish this HTML content for clarity and grammar. Return ONLY valid HTML.\n\n${html}`;
    const system = "You are a professional editor. Output only clean, valid HTML matching the input's structure.";
    const result = await generateAIContent(prompt, system);

    if (result) {
        const clean = result.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
        quill.clipboard.dangerouslyPasteHTML(fixHTMLForQuill(clean));
        saveToLocal();
        showToast("AI Polish Applied");
    }

    DOM.aiPolishBtn.innerHTML = '<i class="fa-solid fa-sparkles"></i> POLISH';
    DOM.aiPolishBtn.disabled = false;
    DOM.loadingOverlay.classList.remove('active');
}

async function handleAISummarize() {
    const text = quill.getText().trim();
    if (!text) return showToast("Nothing to summarize!", "fa-circle-exclamation");

    DOM.aiSummarizeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SUMMARIZING...';
    DOM.aiSummarizeBtn.disabled = true;
    DOM.loadingOverlay.classList.add('active');
    document.querySelector('.loading-title').innerText = "AI Summarizing";
    document.querySelector('.loading-subtitle').innerText = "Gemini is creating a summary of your content...";

    const prompt = `Summarize this content as a short HTML paragraph starting with '✨ AI Summary:'.\n\n${text}`;
    const system = "Output ONLY a single HTML paragraph (<p>...).";
    const result = await generateAIContent(prompt, system);

    if (result) {
        const clean = result.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
        quill.clipboard.dangerouslyPasteHTML(fixHTMLForQuill(clean) + "<br>" + quill.root.innerHTML);
        saveToLocal();
        showToast("AI Summary Added");
    }

    DOM.aiSummarizeBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> SUMMARIZE';
    DOM.aiSummarizeBtn.disabled = false;
    DOM.loadingOverlay.classList.remove('active');
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        showToast("File is too large! Maximum size is 50MB.", "fa-circle-exclamation");
        e.target.value = '';
        return;
    }

    const uploadBtn = document.getElementById('upload-file-btn');
    const originalHtml = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CONVERTING...';
    uploadBtn.disabled = true;

    DOM.loadingOverlay.classList.add('active');
    if (DOM.loadingTitle) DOM.loadingTitle.innerText = "Converting File";
    if (DOM.loadingSubtitle) DOM.loadingSubtitle.innerText = `Sending ${file.name} to local markitdown server...`;

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/convert', { method: 'POST', body: formData });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(err.detail || response.statusText);
        }

        const { markdown: md } = await response.json();

        const html = marked.parse(md);
        quill.clipboard.dangerouslyPasteHTML(fixHTMLForQuill(html));
        DOM.markdownInput.value = md;
        saveToLocal();

        if (DOM.loadingTitle) DOM.loadingTitle.innerText = "All Set!";
        if (DOM.loadingSubtitle) DOM.loadingSubtitle.innerText = "Your content has been imported to the editor.";

        setTimeout(() => {
            DOM.loadingOverlay.classList.remove('active');
            uploadBtn.innerHTML = originalHtml;
            uploadBtn.disabled = false;
            showToast(`${file.name} imported`);
        }, 800);

    } catch (err) {
        console.error("File conversion error:", err);
        showToast(`Import failed: ${err.message}`, "fa-circle-exclamation");
        DOM.loadingOverlay.classList.remove('active');
        uploadBtn.innerHTML = originalHtml;
        uploadBtn.disabled = false;
    } finally {
        e.target.value = '';
    }
}


// ===== BATCH CONVERT =====

function makeBatchFile(file) {
    return { id: crypto.randomUUID(), file, name: file.name, size: file.size,
             status: 'queued', markdown: '', errorMsg: '' };
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function renderBatchFileList() {
    const listEl         = document.getElementById('batch-file-list');
    const convertAllBtn  = document.getElementById('batch-convert-all-btn');
    const downloadZipBtn = document.getElementById('batch-download-zip-btn');
    const summaryEl      = document.getElementById('batch-summary');
    const files          = STATE.batch.files;

    listEl.style.display = files.length > 0 ? 'block' : 'none';
    listEl.innerHTML = '';

    const badges = {
        queued:     ['batch-status--queued',     'fa-clock',              'QUEUED'],
        converting: ['batch-status--converting', 'fa-spinner',            'CONVERTING'],
        done:       ['batch-status--done',       'fa-circle-check',       'DONE'],
        error:      ['batch-status--error',      'fa-circle-exclamation', 'ERROR'],
    };

    files.forEach(bf => {
        const row = document.createElement('div');
        row.className = 'batch-file-row';
        const [badgeClass, badgeIcon, badgeLabel] = badges[bf.status] || badges.queued;
        row.innerHTML = `
            <span class="batch-file-row__name" title="${bf.name}">${bf.name}</span>
            <span class="batch-file-row__size">${formatFileSize(bf.size)}</span>
            <span class="batch-status ${badgeClass}"><i class="fa-solid ${badgeIcon}"></i>${badgeLabel}</span>
            <button class="batch-file-row__download" style="display:${bf.status === 'done' ? 'inline-flex' : 'none'}" data-id="${bf.id}">
                <i class="fa-solid fa-download"></i> .MD
            </button>`;
        listEl.appendChild(row);

        if (bf.status === 'error' && bf.errorMsg) {
            const errRow = document.createElement('div');
            errRow.className = 'batch-file-row--error-detail';
            errRow.textContent = bf.errorMsg;
            listEl.appendChild(errRow);
        }
    });

    listEl.querySelectorAll('.batch-file-row__download').forEach(btn => {
        btn.addEventListener('click', () => batchDownloadSingle(btn.dataset.id));
    });

    const hasQueued = files.some(f => f.status === 'queued');
    const hasDone   = files.some(f => f.status === 'done');
    convertAllBtn.disabled  = !hasQueued || STATE.batch.isRunning;
    downloadZipBtn.disabled = !hasDone;

    if (files.length > 0) {
        const total  = files.length;
        const done   = files.filter(f => f.status === 'done').length;
        const errors = files.filter(f => f.status === 'error').length;
        const parts  = [`${total} file${total !== 1 ? 's' : ''}`];
        if (done)   parts.push(`${done} done`);
        if (errors) parts.push(`${errors} failed`);
        summaryEl.textContent = parts.join(' · ');
    } else {
        summaryEl.textContent = '';
    }
}

function batchAddFiles(fileList) {
    const existingNames = new Set(STATE.batch.files.map(f => f.name));
    let added = 0;
    Array.from(fileList).forEach(file => {
        if (existingNames.has(file.name)) return;
        existingNames.add(file.name);
        STATE.batch.files.push(makeBatchFile(file));
        added++;
    });
    renderBatchFileList();
    if (added > 0) showToast(`${added} file${added !== 1 ? 's' : ''} added`, 'fa-layer-group');
}

async function batchConvertSingle(bf) {
    bf.status = 'converting';
    renderBatchFileList();
    try {
        const formData = new FormData();
        formData.append('file', bf.file);
        const response = await fetch('/api/convert', { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(err.detail || response.statusText);
        }
        const { markdown } = await response.json();
        bf.status = 'done';
        bf.markdown = markdown;
    } catch (err) {
        bf.status = 'error';
        bf.errorMsg = err.message || 'Conversion failed';
    }
    renderBatchFileList();
}

async function batchConvertAll() {
    if (STATE.batch.isRunning) return;
    STATE.batch.isRunning = true;
    renderBatchFileList();
    const toProcess = STATE.batch.files.filter(f => f.status === 'queued');
    for (const bf of toProcess) {
        if (bf.status !== 'queued') continue;
        await batchConvertSingle(bf);
    }
    STATE.batch.isRunning = false;
    renderBatchFileList();
    const done   = STATE.batch.files.filter(f => f.status === 'done').length;
    const errors = STATE.batch.files.filter(f => f.status === 'error').length;
    showToast(
        errors === 0 ? `All ${done} files converted` : `${done} done, ${errors} failed`,
        errors === 0 ? 'fa-circle-check' : 'fa-circle-exclamation'
    );
}

function batchDownloadSingle(id) {
    const bf = STATE.batch.files.find(f => f.id === id);
    if (!bf || bf.status !== 'done') return;
    const baseName = bf.name.replace(/\.[^/.]+$/, '');
    const blob = new Blob([bf.markdown], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${baseName}.md`; a.click();
    URL.revokeObjectURL(url);
}

async function batchDownloadZip() {
    const doneFiles = STATE.batch.files.filter(f => f.status === 'done');
    if (!doneFiles.length) return;
    const zip = new JSZip();
    doneFiles.forEach(bf => zip.file(`${bf.name.replace(/\.[^/.]+$/, '')}.md`, bf.markdown));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'batch-convert.zip'; a.click();
    URL.revokeObjectURL(url);
    showToast(`${doneFiles.length} files zipped`, 'fa-file-zipper');
}

function openBatchModal() {
    document.getElementById('batch-modal').classList.add('active');
}

function closeBatchModal() {
    STATE.batch.files = [];
    STATE.batch.isRunning = false;
    document.getElementById('batch-file-input').value = '';
    renderBatchFileList();
    document.getElementById('batch-modal').classList.remove('active');
}

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    initDOM();
    
    if (DOM.appVersion) {
        DOM.appVersion.textContent = `v${APP_VERSION}`;
    }

    initQuill();
    initTurndown();
    loadFromLocal();

    // Event Listeners
    DOM.convertToMdBtn.addEventListener('click', () => {
        syncRTtoMD();
        showToast('Converted to Markdown');
    });

    DOM.convertToRtBtn.addEventListener('click', () => {
        syncMDtoRT();
        showToast('Converted to Rich Text');
    });

    DOM.exportBtn.addEventListener('click', exportMarkdown);
    DOM.aiPolishBtn.addEventListener('click', handleAIPolish);
    DOM.aiSummarizeBtn.addEventListener('click', handleAISummarize);

    DOM.rtCopyBtn.addEventListener('click', () => handleCopy('rt'));
    DOM.mdCopyBtn.addEventListener('click', () => handleCopy('md'));
    DOM.rtPasteBtn.addEventListener('click', () => handlePaste('rt'));
    DOM.mdPasteBtn.addEventListener('click', () => handlePaste('md'));

    // Settings Listeners
    DOM.settingsBtn.addEventListener('click', () => {
        DOM.apiKeyInput.value = getApiKey();
        DOM.settingsModal.classList.add('active');
    });

    DOM.closeSettings.addEventListener('click', () => {
        DOM.settingsModal.classList.remove('active');
    });

    DOM.saveSettings.addEventListener('click', () => {
        const key = DOM.apiKeyInput.value.trim();
        localStorage.setItem('richtexttomd_gemini_key', key);
        showToast("Settings Saved Locally");
        DOM.settingsModal.classList.remove('active');
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === DOM.settingsModal) {
            DOM.settingsModal.classList.remove('active');
        }
    });

    const fileBtn = document.getElementById('upload-file-btn');
    const fileInput = document.getElementById('file-upload');
    if (fileBtn && fileInput) {
        fileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
    }

    DOM.markdownInput.addEventListener('input', handleMDChange);

    DOM.filenameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            exportMarkdown();
        }
    });

    DOM.liveSyncToggle.addEventListener('click', () => {
        STATE.liveSyncEnabled = !STATE.liveSyncEnabled;
        DOM.liveSyncToggle.classList.toggle('sync-active', STATE.liveSyncEnabled);

        if (STATE.liveSyncEnabled) {
            showToast('Live Sync Enabled', 'fa-rotate');
            syncRTtoMD(); // Initial sync
        } else {
            showToast('Live Sync Disabled', 'fa-toggle-off');
        }
        localStorage.setItem('richtexttomd_sync', STATE.liveSyncEnabled);
    });

    // Clear functionality
    const clearBtn = document.getElementById('clear-rt');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear both editors?')) {
                quill.root.innerHTML = '';
                DOM.markdownInput.value = '';
                saveToLocal();
                showToast('Editors cleared', 'fa-eraser');
            }
        });
    }

    // Load sync preference
    const savedSync = localStorage.getItem('richtexttomd_sync') === 'true';
    if (savedSync) {
        STATE.liveSyncEnabled = true;
        DOM.liveSyncToggle.classList.add('sync-active');
    }

    // ---- Batch Convert ----
    DOM.batchConvertBtn.addEventListener('click', openBatchModal);
    DOM.closeBatchModalBtn.addEventListener('click', closeBatchModal);
    window.addEventListener('click', (e) => { if (e.target === DOM.batchModal) closeBatchModal(); });
    DOM.batchDropzone.addEventListener('click', () => DOM.batchFileInput.click());
    DOM.batchFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) batchAddFiles(e.target.files);
        e.target.value = '';
    });
    DOM.batchDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.batchDropzone.classList.add('dragover');
    });
    DOM.batchDropzone.addEventListener('dragleave', (e) => {
        if (!DOM.batchDropzone.contains(e.relatedTarget)) DOM.batchDropzone.classList.remove('dragover');
    });
    DOM.batchDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.batchDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) batchAddFiles(e.dataTransfer.files);
    });
    DOM.batchConvertAllBtn.addEventListener('click', batchConvertAll);
    DOM.batchDownloadZipBtn.addEventListener('click', batchDownloadZip);
});
