// ── HOME VIEW — TILED WINDOW MANAGER ─────────────────────────────────────────

function homeView() {
    const darkOn = model.isDarkmode;
    const rows = model.tileLayout;

    const boardRows = rows.map((row, rIdx) => renderTileRow(row, rIdx)).join('');
    const dropZone = renderBottomDropZone();

    // Item count for the subbar
    const countText = _subbarCountText();

    // Headline: Weekday + time-of-day, e.g. "Tuesday afternoon."
    // The time-of-day word is the italic-sage emphasis.
    const now = new Date();
    const hr = now.getHours();
    const todKey = hr < 12 ? 'sub_morning'
                 : hr < 18 ? 'sub_afternoon'
                           : 'sub_evening';
    const weekday = t('wd_' + now.getDay());
    const tod = t(todKey);
    const headline = `${escHtml(weekday)} <em>${escHtml(tod)}</em>.`;

    // Date prefix for the .when line — "May 7" / "7. mai" depending on locale
    const month = t('mo_' + now.getMonth());
    const day = now.getDate();
    const dateStr = lang === 'no' ? `${day}. ${month}` : `${month} ${day}`;

    const username = API.username || '';
    const avatar = username ? username.charAt(0).toUpperCase() : '·';

    // Inactive panels available to add via the pill in the subbar
    const inactive = layoutGetInactive();
    const addPanelOpen = model.addPanelOpen && inactive.length > 0;

    const textSizeTitle = lang === 'no' ? 'Tekststørrelse' : 'Text size';

    return /*html*/`
    <div class="topbar">
        <div class="topbar-brand">
            ${_mbMark(16)}
            <span>My<em>Board</em></span>
        </div>
        <div class="text-size-slider" title="${textSizeTitle}">
            <span class="tsl-label tsl-small">A</span>
            <input type="range" min="0.8" max="1.6" step="0.05" value="${model.textScale}"
                   aria-label="${textSizeTitle}"
                   oninput="setTextScale(this.value)">
            <span class="tsl-label tsl-large">A</span>
        </div>
        ${langSwitcher()}
        <button class="pill"><span class="av">${escHtml(avatar)}</span>${escHtml(username)}</button>
        <button class="btn-light ${darkOn ? 'on' : ''}"
                onclick="themeToggle()"
                title="${darkOn ? t('btn_dark') : t('btn_light')}"></button>
        <button class="btn-logout" onclick="doLogout()">${t('btn_logout')}</button>
    </div>

    <div class="subbar">
        <h1>${headline}</h1>
        <span class="when">${escHtml(dateStr)} · <span id="subbar-count-text">${countText}</span></span>
        <div class="right">
            ${inactive.length > 0 ? `
                <div class="add-board-wrap${addPanelOpen ? ' open' : ''}">
                    <button class="pill add-board-pill ${addPanelOpen ? 'on' : ''}"
                            onclick="event.stopPropagation(); toggleAddPanel();">
                        ${addPanelOpen ? '×' : '+'}&nbsp;&nbsp;${t('btn_add_board').replace(/^\\+\\s*/, '')}
                    </button>
                    ${addPanelOpen ? renderAddBoardPicker(inactive) : ''}
                </div>
            ` : ''}
            <button class="pill muted" onclick="doResetAll(this)">${t('btn_reset_all')}</button>
        </div>
    </div>

    <div class="tile-board" id="tile-board">
        ${boardRows}
        ${dropZone}
    </div>
    `;
}

// Picker that drops down from the "+ Add a board" pill in the subbar
function renderAddBoardPicker(inactive) {
    const remaining = inactive.length;
    const moreLabel = t('ap_more', { n: remaining });

    return /*html*/`
        <div class="add-board-picker" onclick="event.stopPropagation();">
            <div class="add-board-picker-head">
                <span>${t('ap_picker_title')}</span>
                <span class="add-board-picker-meta">${moreLabel}</span>
            </div>
            <div class="add-board-picker-list">
                ${inactive.map(p => `
                    <button class="add-panel-option" onclick="layoutAddPanel('${p.id}')">
                        <span class="apo-icon">${p.icon}</span>
                        <span class="apo-label">${t(p.labelKey)}</span>
                        <span class="apo-desc">${t(p.descKey)}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// ── ROW RENDERING ─────────────────────────────────────────────────────────────

function renderTileRow(row, rIdx) {
    const cells = row.map((cell, cIdx) => renderTileCell(cell, rIdx, cIdx, row)).join('');
    return /*html*/`
        <div class="tile-row" data-row="${rIdx}">
            ${cells}
        </div>
    `;
}

function _panelItemCount(panel) {
    if (panel.id === 'tasks') {
        const done = model.tasks.filter(t => t.ischecked).length;
        const total = model.tasks.length;
        return total ? `${done}/${total}` : '';
    }
    const items = model.lists[panel.id] || [];
    return items.length ? String(items.length).padStart(2, '0') : '';
}

function renderTileCell(cell, rIdx, cIdx, row) {
    const panel = PANEL_REGISTRY.find(p => p.id === cell.id);
    if (!panel) return '';
    const isLast = cIdx === row.length - 1;

    return /*html*/`
        <div class="tile-panel"
             style="flex: ${cell.flex} ${cell.flex} 0%; min-width: 160px;"
             data-panel-id="${panel.id}"
             data-row="${rIdx}"
             data-col="${cIdx}"
             ondragover="tileDragOver(event)"
             ondrop="tileDrop(event, '${panel.id}')"
             ondragleave="tileDragLeave(event)">

            <div class="tile-edge tile-edge-left"   data-edge="left"
                 ondragover="tileEdgeOver(event,'left')"
                 ondrop="tileEdgeDrop(event,'${panel.id}','left')"
                 ondragleave="tileEdgeLeave(event)"></div>
            <div class="tile-edge tile-edge-right"  data-edge="right"
                 ondragover="tileEdgeOver(event,'right')"
                 ondrop="tileEdgeDrop(event,'${panel.id}','right')"
                 ondragleave="tileEdgeLeave(event)"></div>
            <div class="tile-edge tile-edge-top"    data-edge="top"
                 ondragover="tileEdgeOver(event,'top')"
                 ondrop="tileEdgeDrop(event,'${panel.id}','top')"
                 ondragleave="tileEdgeLeave(event)"></div>
            <div class="tile-edge tile-edge-bottom" data-edge="bottom"
                 ondragover="tileEdgeOver(event,'bottom')"
                 ondrop="tileEdgeDrop(event,'${panel.id}','bottom')"
                 ondragleave="tileEdgeLeave(event)"></div>

            <div class="tile-panel-inner">${renderTilePanelInner(panel)}</div>

            ${!isLast ? `<div class="tile-resize-handle" data-panel-id="${panel.id}" onmousedown="tileResizeStart(event, '${panel.id}')"></div>` : ''}
        </div>
    `;
}

// Inner contents of a tile panel: header, input row, scrollable body.
// Extracted so rerenderPanel() can swap one panel's contents without
// rebuilding the entire board.
function renderTilePanelInner(panel) {
    const [bodyHtml, inputHtml] = renderPanelContent(panel);
    const count = _panelItemCount(panel);

    return /*html*/`
        <div class="panel-header">
            <span class="panel-drag-grip"
                  draggable="true"
                  ondragstart="tileDragStart(event, '${panel.id}')"
                  ondragend="tileDragEnd(event)"
                  title="${lang === 'no' ? 'Dra for å flytte' : 'Drag to move'}">⠿</span>
            <span class="panel-icon">${panel.icon}</span>
            <span class="panel-title"
                  ondblclick="layoutExpandInRow('${panel.id}')"
                  title="${lang === 'no' ? 'Dobbeltklikk for å utvide' : 'Double-click to expand'}">${t(panel.labelKey)}</span>
            ${count ? `<span class="panel-count">${count}</span>` : ''}

            <div class="panel-controls">
                <button class="panel-ctrl-btn" onclick="layoutExpandInRow('${panel.id}')"
                    title="${lang === 'no' ? 'Utvid/gjenopprett' : 'Expand/restore'}">⤢</button>
                <button class="btn-reset"
                    onclick="spinReset('${panel.id}', this)" title="${t('btn_clear')}">↺</button>
                <button class="panel-ctrl-btn panel-ctrl-hide"
                    onclick="layoutRemovePanel('${panel.id}')"
                    title="${lang === 'no' ? 'Skjul panel' : 'Hide panel'}">✕</button>
            </div>
        </div>

        ${inputHtml}
        <div class="panel-scroll">${bodyHtml}</div>
    `;
}

// Subbar item count text (computed identically to homeView).
function _subbarCountText() {
    const itemCount = Object.values(model.lists).reduce((s, arr) => s + arr.length, 0)
        + model.tasks.length;
    if (itemCount === 0) return t('sub_count_empty');
    if (itemCount === 1) return t('sub_count_one');
    return t('sub_count_many', { n: itemCount });
}

// Replace one panel's inner content without touching the rest of the board.
// Falls back to a full updateView() if the panel isn't currently mounted
// (e.g. the panel was just added/removed via the layout).
function rerenderPanel(panelId) {
    const el = document.querySelector(`.tile-panel[data-panel-id="${CSS.escape(panelId)}"] .tile-panel-inner`);
    if (!el) { updateView(); return; }
    const panel = PANEL_REGISTRY.find(p => p.id === panelId);
    if (!panel) { updateView(); return; }
    el.innerHTML = renderTilePanelInner(panel);
}

// Refresh just the item-count text in the subbar.
function rerenderSubbarCount() {
    const el = document.getElementById('subbar-count-text');
    if (el) el.textContent = _subbarCountText();
}

// ── BOTTOM DROP ZONE ──────────────────────────────────────────────────────────

function renderBottomDropZone() {
    return /*html*/`
        <div class="tile-bottom-drop" id="tile-bottom-drop"
             ondragover="tileBottomDragOver(event)"
             ondragleave="tileBottomDragLeave(event)"
             ondrop="tileBottomDrop(event)">
            <span class="tile-bottom-drop-label">
                ${lang === 'no' ? '↓ Slipp her for ny rad' : '↓ Drop here for new row'}
            </span>
        </div>
    `;
}

// ── DRAG & DROP ───────────────────────────────────────────────────────────────

let _tileDragging = null;

function tileDragStart(event, id) {
    _tileDragging = id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    const panelEl = document.querySelector(`.tile-panel[data-panel-id="${id}"]`);
    if (panelEl && event.dataTransfer.setDragImage) {
        event.dataTransfer.setDragImage(panelEl, 20, 20);
    }
    setTimeout(() => {
        if (panelEl) panelEl.classList.add('tile-dragging');
        const board = document.getElementById('tile-board');
        if (board) board.classList.add('drag-active');
    }, 0);
}

function tileDragEnd(event) {
    document.querySelectorAll('.tile-dragging, .tile-edge-active, .tile-bottom-drop.active').forEach(el => {
        el.classList.remove('tile-dragging', 'tile-edge-active', 'active');
    });
    const board = document.getElementById('tile-board');
    if (board) board.classList.remove('drag-active');
    _tileDragging = null;
}

function tileDragOver(event) {
    if (!_tileDragging) return;
    event.preventDefault();
}

function tileDragLeave(event) { /* edges handle their own leave */ }

function tileDrop(event, targetId) {
    event.preventDefault();
    event.stopPropagation();
    if (!_tileDragging || _tileDragging === targetId) return;
    layoutMovePanel(_tileDragging, targetId, 'right');
}

function tileEdgeOver(event, edge) {
    if (!_tileDragging) return;
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.add('tile-edge-active');
}

function tileEdgeLeave(event) {
    event.target.classList.remove('tile-edge-active');
}

function tileEdgeDrop(event, targetId, edge) {
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.remove('tile-edge-active');
    if (!_tileDragging || _tileDragging === targetId) return;
    layoutMovePanel(_tileDragging, targetId, edge);
}

function tileBottomDragOver(event) {
    if (!_tileDragging) return;
    event.preventDefault();
    document.getElementById('tile-bottom-drop').classList.add('active');
}

function tileBottomDragLeave(event) {
    document.getElementById('tile-bottom-drop').classList.remove('active');
}

function tileBottomDrop(event) {
    event.preventDefault();
    document.getElementById('tile-bottom-drop').classList.remove('active');
    if (!_tileDragging) return;
    const rows = model.tileLayout;
    if (!rows.length) return;
    const lastRow = rows[rows.length - 1];
    const lastCell = lastRow[lastRow.length - 1];
    if (lastCell.id === _tileDragging) return;
    layoutMovePanel(_tileDragging, lastCell.id, 'bottom');
}

// ── RESIZE HANDLE ─────────────────────────────────────────────────────────────

let _resizeState = null;

function tileResizeStart(event, id) {
    event.preventDefault();
    _resizeState = { id, startX: event.clientX };

    const panel = document.querySelector(`.tile-panel[data-panel-id="${id}"]`);
    const row = panel ? panel.closest('.tile-row') : null;
    const rowWidth = row ? row.offsetWidth : window.innerWidth;
    _resizeState.rowWidth = rowWidth;

    const pos = layoutFindCell(model.tileLayout, id);
    if (!pos) return;
    _resizeState.row = pos.r;
    _resizeState.startFlex = model.tileLayout[pos.r][pos.c].flex;
    _resizeState.totalFlex = model.tileLayout[pos.r].reduce((s, c) => s + c.flex, 0);

    document.addEventListener('mousemove', tileResizeMove);
    document.addEventListener('mouseup', tileResizeEnd);
    document.body.classList.add('tile-resizing');
}

function tileResizeMove(event) {
    if (!_resizeState) return;
    const dx = event.clientX - _resizeState.startX;
    const flexPerPx = _resizeState.totalFlex / _resizeState.rowWidth;
    const delta = dx * flexPerPx;

    const rows = model.tileLayout.map(r => r.map(c => ({ ...c })));
    const pos = layoutFindCell(rows, _resizeState.id);
    if (!pos) return;
    const row = rows[pos.r];
    const cell = row[pos.c];
    const neighbour = row[pos.c + 1];
    if (!neighbour) return;

    const newFlex = Math.max(0.5, _resizeState.startFlex + delta);
    const diffActual = newFlex - _resizeState.startFlex;

    cell.flex = newFlex;
    const origN = model.tileLayout[pos.r][pos.c + 1].flex;
    neighbour.flex = Math.max(0.5, origN - diffActual);

    model.tileLayout = rows;
    updateView();
}

function tileResizeEnd() {
    if (_resizeState) layoutSave(model.tileLayout);
    _resizeState = null;
    document.removeEventListener('mousemove', tileResizeMove);
    document.removeEventListener('mouseup', tileResizeEnd);
    document.body.classList.remove('tile-resizing');
}

// ── MISC ──────────────────────────────────────────────────────────────────────

function toggleAddPanel() {
    model.addPanelOpen = !model.addPanelOpen;
    updateView();
}

function spinReset(listName, btn) {
    btn.classList.remove('spinning');
    void btn.offsetWidth;
    btn.classList.add('spinning');
    btn.addEventListener('animationend', () => btn.classList.remove('spinning'), { once: true });
    resetList(listName);
}

async function doResetAll(btn) {
    const confirmed = confirm(lang === 'no'
        ? 'Er du sikker? Dette sletter alt.'
        : 'Are you sure? This will clear everything.');
    if (!confirmed) return;
    const label = btn.querySelector('.reset-icon');
    if (label) {
        label.style.transform = 'rotate(-360deg)';
        label.style.transition = 'transform 0.5s cubic-bezier(.4,0,.2,1)';
        setTimeout(() => { label.style.transform = ''; label.style.transition = ''; }, 500);
    }
    await resetAll();
}

function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Minimal, safe markdown renderer for AI-generated answers/definitions.
// Escapes HTML first, then converts a small markdown subset. Code spans/blocks
// are extracted before escape so their content stays literal.
function mdToHtml(str) {
    if (str === null || str === undefined) return '';
    let s = String(str).replace(/\r\n/g, '\n');

    const codeBlocks = [];
    s = s.replace(/```([\s\S]*?)```/g, (_, code) => {
        codeBlocks.push(code.replace(/^[\w-]*\n/, '').replace(/\n$/, ''));
        return `\n\nMDXCB${codeBlocks.length - 1}XCB\n\n`;
    });
    const inlineCode = [];
    s = s.replace(/`([^`\n]+)`/g, (_, code) => {
        inlineCode.push(code);
        return `MDXIC${inlineCode.length - 1}XIC`;
    });

    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    s = s.replace(/^### +(.+)$/gm, '<h4>$1</h4>')
         .replace(/^## +(.+)$/gm, '<h3>$1</h3>')
         .replace(/^# +(.+)$/gm, '<h2>$1</h2>');

    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
         .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
         .replace(/(^|[\s(>])\*([^*\n]+)\*/g, '$1<em>$2</em>')
         .replace(/(^|[\s(>])_([^_\n]+)_(?=[\s.,;:!?)\]]|$)/g, '$1<em>$2</em>');

    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    s = s.replace(/(?:^[-*+] +.+(?:\n|$))+/gm, (block) => {
        const items = block.trim().split('\n')
            .map(line => `<li>${line.replace(/^[-*+] +/, '')}</li>`).join('');
        return `<ul>${items}</ul>\n`;
    });
    s = s.replace(/(?:^\d+\. +.+(?:\n|$))+/gm, (block) => {
        const items = block.trim().split('\n')
            .map(line => `<li>${line.replace(/^\d+\. +/, '')}</li>`).join('');
        return `<ol>${items}</ol>\n`;
    });

    s = s.replace(/([^\n])\n?(<(?:h[1-6]|ul|ol|pre|blockquote)\b)/g, '$1\n\n$2')
         .replace(/(<\/(?:h[1-6]|ul|ol|pre|blockquote)>)\n?([^\n])/g, '$1\n\n$2');

    s = s.split(/\n{2,}/).map(b => {
        b = b.trim();
        if (!b) return '';
        if (/^MDXCB\d+XCB$/.test(b)) return b;
        if (/^<(h[1-6]|ul|ol|pre|blockquote)/.test(b)) return b;
        return `<p>${b.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    s = s.replace(/MDXIC(\d+)XIC/g, (_, i) => {
        const c = inlineCode[+i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<code>${c}</code>`;
    });
    s = s.replace(/MDXCB(\d+)XCB/g, (_, i) => {
        const c = codeBlocks[+i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre><code>${c}</code></pre>`;
    });

    return s;
}
