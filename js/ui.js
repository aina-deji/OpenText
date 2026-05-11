/**
 * ui.js – OpenText
 * 
 * Handles:
 *   - Folder upload (click / drag & drop)
 *   - Dynamic file checklist (check/uncheck)
 *   - Generating and downloading the merged .txt
 *   - Hamburger menu, back‑to‑top, toast notifications
 *   - Scroll‑triggered fade‑in animations
 */

/* ─── Wait for the DOM to be ready ─── */
document.addEventListener('DOMContentLoaded', () => {
    /* ─── Cache DOM elements ─── */
    // ── PWA: register service worker ──
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js')
            .then(reg => console.log('Fltxt SW registered', reg.scope))
            .catch(err => console.warn('Fltxt SW registration failed:', err));
    });
}
/* ends */
    const uploadZone    = document.getElementById('uploadZone');
    const folderInput   = document.getElementById('folderInput');
    const checklistSec  = document.getElementById('checklistSection');
    const fileListCont  = document.getElementById('fileListContainer');
    const selectedCount = document.getElementById('selectedCount');
    const totalCount    = document.getElementById('totalCount');
    const fileBadge     = document.getElementById('fileCountBadge');
    const generateBtn   = document.getElementById('generateBtn');
    const selectAllBtn  = document.getElementById('selectAllBtn');
    const deselectAllBtn= document.getElementById('deselectAllBtn');
    const backToTopBtn  = document.getElementById('backToTop');
    const toast         = document.getElementById('toast');

    /* ─── State ─── */
    let allFilteredFiles = [];     // { file, relativePath, ext }
    let checkedState = new Map(); // relativePath -> boolean (true = selected)

    /* ─── Toast helper ─── */
    let toastTimer;
    function showToast(msg) {
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.add('show');
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    /* ─── Filter files using processor.js logic ─── */
    function filterAndStore(filesArray) {
        // Use the same isFileAllowed from processor.js (global scope)
        allFilteredFiles = Array.from(filesArray)
            .filter(isFileAllowed)
            .map(file => ({
                file,
                relativePath: file.webkitRelativePath || file.name,
                ext: '.' + (file.webkitRelativePath || file.name).split('.').pop().toLowerCase(),
            }));

        if (allFilteredFiles.length === 0) {
            showToast('No matching files found in this folder.');
            checklistSec.classList.add('hidden');
            fileBadge.classList.add('hidden');
            return;
        }

        // Show a summary badge
        const ignoredCount = filesArray.length - allFilteredFiles.length;
        fileBadge.textContent = `${allFilteredFiles.length} files ready · ${ignoredCount} ignored`;
        fileBadge.classList.remove('hidden');

        // Build the checklist
        renderChecklist();
        checklistSec.classList.remove('hidden');
        checklistSec.scrollIntoView({ behavior: 'smooth' });
    }

    /* ─── Render the interactive checklist ─── */
    function renderChecklist() {
        fileListCont.innerHTML = '';
        checkedState.clear();

        allFilteredFiles.forEach((item) => {
            checkedState.set(item.relativePath, true); // default: selected

            // Create row
            const row = document.createElement('div');
            row.className = 'file-item flex items-center gap-3 px-5 py-3 border-b border-[#1a1a1a] last:border-b-0';
            row.innerHTML = `
                <input type="checkbox" class="custom-checkbox" checked data-path="${item.relativePath}">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 ${getDotClass(item.ext)}"></span>
                <span class="text-sm text-[#cccccc] truncate flex-1 select-none">${item.relativePath}</span>
                <span class="text-xs text-[#555555] flex-shrink-0 uppercase font-mono">${item.ext.replace('.', '')}</span>
            `;

            // Toggle checkbox on row click (except when clicking directly on the checkbox)
            const checkbox = row.querySelector('.custom-checkbox');
            row.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                checkbox.checked = !checkbox.checked;
                checkedState.set(item.relativePath, checkbox.checked);
                updateCounts();
            });

            // Direct checkbox change
            checkbox.addEventListener('change', () => {
                checkedState.set(item.relativePath, checkbox.checked);
                updateCounts();
            });

            fileListCont.appendChild(row);
        });

        updateCounts();
    }

    /* ─── Update selection counts and button state ─── */
    function updateCounts() {
        const total = allFilteredFiles.length;
        const selected = Array.from(checkedState.values()).filter(Boolean).length;
        selectedCount.textContent = `${selected} selected`;
        totalCount.textContent = `${total} files`;
        generateBtn.disabled = (selected === 0);
    }

    /* ─── Dot color helper (mirrors processor.js extension) ─── */
    function getDotClass(ext) {
        const map = {
            '.js':'dot-js', '.jsx':'dot-js', '.ts':'dot-js', '.tsx':'dot-js',
            '.html':'dot-html', '.htm':'dot-html',
            '.css':'dot-css', '.scss':'dot-css', '.less':'dot-css',
            '.md':'dot-md', '.txt':'dot-txt',
            '.json':'dot-json', '.yaml':'dot-json', '.yml':'dot-json',
        };
        return map[ext] || 'dot-txt';
    }

    /* ─── Upload triggers ─── */
    uploadZone.addEventListener('click', () => folderInput.click());
    uploadZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            folderInput.click();
        }
    });

    folderInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            filterAndStore(e.target.files);
        }
        // Reset so the same folder can be selected again
        folderInput.value = '';
    });

    /* ─── Drag & Drop ─── */
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            filterAndStore(e.dataTransfer.files);
        }
    });

    /* ─── Select All / Deselect All ─── */
    selectAllBtn.addEventListener('click', () => {
        checkedState.forEach((_, path) => checkedState.set(path, true));
        document.querySelectorAll('.custom-checkbox').forEach(cb => cb.checked = true);
        updateCounts();
    });
    deselectAllBtn.addEventListener('click', () => {
        checkedState.forEach((_, path) => checkedState.set(path, false));
        document.querySelectorAll('.custom-checkbox').forEach(cb => cb.checked = false);
        updateCounts();
    });

    /* ─── Generate & Download ─── */
    generateBtn.addEventListener('click', async () => {
        const filesToProcess = allFilteredFiles.filter(item => checkedState.get(item.relativePath));
        if (filesToProcess.length === 0) return;

        // Disable button while processing
        generateBtn.disabled = true;
        generateBtn.textContent = 'Processing…';

        try {
            // Call the core function from processor.js
            const mergedText = await processFolders(filesToProcess.map(f => f.file));
            downloadAsFile(mergedText);
            showToast('Download started!');
        } catch (err) {
            console.error(err);
            showToast('Error processing files. Check console.');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate & Download TXT';
            updateCounts(); // in case something changed
        }
    });

    function downloadAsFile(text) {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Timestamped filename
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
        a.download = `project-export-${stamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    /* ─── Back to Top Button ─── */
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    }, { passive: true });
    backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* ─── Hamburger Menu ─── */
    const overlay   = document.getElementById('hamburgerOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    const closeBtn  = document.getElementById('closeMenuBtn');
    const menuLinks = document.querySelectorAll('.menu-link');

    hamburger.addEventListener('click', () => overlay.classList.add('open'));
    closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
    menuLinks.forEach(link => link.addEventListener('click', () => overlay.classList.remove('open')));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) overlay.classList.remove('open');
    });

    /* ─── Fade‑in sections on scroll ─── */
    const fadeSections = document.querySelectorAll('.fade-section');
    function revealOnScroll() {
        const windowHeight = window.innerHeight;
        fadeSections.forEach(sec => {
            const rect = sec.getBoundingClientRect();
            if (rect.top < windowHeight * 0.85) {
                sec.classList.add('revealed');
            }
        });
    }
    window.addEventListener('scroll', revealOnScroll, { passive: true });
    revealOnScroll(); // initial check

    /* ─── Populate static content (features, stages, social links) ─── */
    populateFeatures();
    populateStages();
    populateSocialLinks();
});

/* ─── Feature cards data (static) ─── */
function populateFeatures() {
    const grid = document.getElementById('featuresGrid');
    if (!grid) return;
    const features = [
        { title: 'Auto Exclusion', desc: 'Automatically excludes node_modules, .git, and other noise.' },
        { title: 'Zero server dependency', desc: 'Everything stays in your browser. No uploads, no servers.' },
        { title: 'Granular selection', desc: 'Check and uncheck exactly which files to include.' },
        { title: 'Instant Export', desc: 'No waiting. Merged text file downloads immediately.' },
        { title: 'Optimized Output', desc: 'Cleanly formatted with file path headers.' },
    ];
    grid.innerHTML = features.map(f => `
        <div class="feature-card bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-5">
            <div class="w-10 h-10 rounded-lg bg-[#161616] flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="white" stroke-width="1.8" stroke-dasharray="2 2"/></svg>
            </div>
            <h3 class="text-white font-semibold text-sm mb-2">${f.title}</h3>
            <p class="text-[#888888] text-xs leading-relaxed">${f.desc}</p>
        </div>
    `).join('');
}

function populateStages() {
    const grid = document.getElementById('stagesGrid');
    if (!grid) return;
    const stages = [
        { letter: 'A', title: 'Upload', desc: 'Browser asks permission to view folder. You approve, and the file list is received.' },
        { letter: 'B', title: 'filter', desc: 'Filters out irrelevant files and folders instantly, keeping only source code.' },
        { letter: 'C', title: 'Merge', desc: 'All selected files are read in parallel and merged into one structured string.' },
        { letter: 'D', title: 'Delivery', desc: ' Your files is automatically available for download in seconds. Done.' },
    ];
    grid.innerHTML = stages.map(s => `
        <div class="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-5 relative">
            <span class="text-xs text-[#555555] font-mono tracking-widest uppercase mb-3 block">Stage ${s.letter}</span>
            <h4 class="text-white font-semibold text-sm mb-2">${s.title}</h4>
            <p class="text-[#888888] text-xs leading-relaxed">${s.desc}</p>
        </div>
    `).join('');
}

function populateSocialLinks() {
    const container = document.getElementById('socialLinks');
    if (!container) return;
    const links = [
        { href: 'https://github.com/aina-deji', label: 'GitHub', icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path fill-rule="evenodd" d="M9 0C4.03 0 0 4.03 0 9c0 3.98 2.58 7.33 6.16 8.52.45.08.61-.2.61-.44 0-.21-.01-1.1-.01-2-2.5.54-3.01-1.06-3.01-1.06-.41-1.04-1-1.32-1-1.32-.82-.56.06-.55.06-.55.91.06 1.39.93 1.39.93.8 1.37 2.1.97 2.62.74.08-.58.31-.97.57-1.19-2-.23-4.1-1-4.1-4.45 0-.98.35-1.78.93-2.41-.09-.23-.4-1.14.09-2.38 0 0 .74-.24 2.43.93a8.46 8.46 0 0 1 4.42 0c1.69-1.17 2.43-.93 2.43-.93.49 1.24.18 2.15.09 2.38.58.63.93 1.43.93 2.41 0 3.46-2.11 4.22-4.11 4.44.32.27.6.8.6 1.61 0 1.16-.01 2.1-.01 2.39 0 .24.16.52.62.44A9.003 9.003 0 0 0 18 9c0-4.97-4.03-9-9-9z"/></svg>' },
        { href: 'https://x.com/Eukaryotical', label: 'Twitter', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9.522 6.775L15.108 0H13.78L8.93 5.883 5.015 0H.5l5.859 8.895L.5 16h1.328l5.12-6.213L11.085 16H15.6L9.522 6.775ZM7.69 8.974l-.432-.896L2.306 1.04h2.069l3.85 5.688.6.896 4.957 7.384h-2.069L7.69 8.974z"/></svg>' },
        { href: 'https://www.linkedin.com/in/aina-ayodeji', label: 'LinkedIn', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 1.5C3.5 2.33 2.83 3 2 3 1.17 3 .5 2.33.5 1.5.5.67 1.17 0 2 0c.83 0 1.5.67 1.5 1.5zM.5 5h3v11h-3V5zm5 0h3v1.5c0 .1 1-1.8 3-1.8 2 0 4 1.3 4 4.8V16h-3v-6c0-1.5-1-2-2-2s-2 .5-2 2.5V16h-3V5z"/></svg>' },
        { href: 'mailto:aina.ayodeji.dev@gmail.com', label: 'Email', icon: '<svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="1" width="16" height="12" rx="2"/><path d="M1 3l8 6 8-6"/></svg>' },
    ];
    container.innerHTML = links.map(l => `
        <a href="${l.href}" aria-label="${l.label}" class="text-[#666666] hover:text-white transition-colors duration-200" target="_blank" rel="noopener">${l.icon}</a>
    `).join('');
}