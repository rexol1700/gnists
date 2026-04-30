// ── HOME VIEW — TILED WINDOW MANAGER ─────────────────────────────────────────

function homeView() {
    const lightOn = model.isLightmode;
    const rows = model.tileLayout;

    const boardRows = rows.map((row, rIdx) => renderTileRow(row, rIdx)).join('');
    const dropZone = renderBottomDropZone();

    return /*html*/`
    <div class="topbar">
        <span class="topbar-title">Gnists ✦</span>
        <div class="topbar-actions">
            ${langSwitcher()}
            <span class="topbar-user">👤 ${API.username}</span>
            <button class="btn-reset-all" onclick="doResetAll(this)">
                <span class="reset-icon">↺</span> ${t('btn_reset_all')}
            </button>
            <button class="btn-light ${lightOn ? 'on' : ''}"
                onclick="lightToggle()"
                title="${lightOn ? t('btn_dark') : t('btn_light')}"></button>
            <button class="btn-logout" onclick="doLogout()">${t('btn_logout')}</button>
        </div>
    </div>

    <div class="tile-board" id="tile-board">
        ${boardRows}
        ${dropZone}
    </div>
    `;
}

// ── ROW RENDERING ─────────────────────────────────────────────────────────────

function renderTileRow(row, rIdx) {
    // Row 0 always gets the add-panel slot as its last cell
    const addSlot = rIdx === 0 ? renderAddPanelInRow() : '';
    const cells = row.map((cell, cIdx) => renderTileCell(cell, rIdx, cIdx, row)).join('');
    return /*html*/`
        <div class="tile-row" data-row="${rIdx}">
            ${cells}
            ${addSlot}
        </div>
    `;
}

function renderTileCell(cell, rIdx, cIdx, row) {
    const panel = PANEL_REGISTRY.find(p => p.id === cell.id);
    if (!panel) return '';
    const [bodyHtml, inputHtml] = renderPanelContent(panel);
    const isLast = cIdx === row.length - 1;
    const totalFlex = row.reduce((s, c) => s + c.flex, 0);
    const pct = ((cell.flex / totalFlex) * 100).toFixed(3);

    return /*html*/`
        <div class="tile-panel"
             style="flex: ${cell.flex} ${cell.flex} 0%; min-width: 120px;"
             data-panel-id="${panel.id}"
             data-row="${rIdx}"
             data-col="${cIdx}"
             ondragover="tileDragOver(event)"
             ondrop="tileDrop(event, '${panel.id}')"
             ondragleave="tileDragLeave(event)">

            <!-- Drop edges (invisible hit areas) -->
            <div class="tile-edge tile-edge-left"   data-edge="left"   ondragover="tileEdgeOver(event,'left')"   ondrop="tileEdgeDrop(event,'${panel.id}','left')"   ondragleave="tileEdgeLeave(event)"></div>
            <div class="tile-edge tile-edge-right"  data-edge="right"  ondragover="tileEdgeOver(event,'right')"  ondrop="tileEdgeDrop(event,'${panel.id}','right')"  ondragleave="tileEdgeLeave(event)"></div>
            <div class="tile-edge tile-edge-top"    data-edge="top"    ondragover="tileEdgeOver(event,'top')"    ondrop="tileEdgeDrop(event,'${panel.id}','top')"    ondragleave="tileEdgeLeave(event)"></div>
            <div class="tile-edge tile-edge-bottom" data-edge="bottom" ondragover="tileEdgeOver(event,'bottom')" ondrop="tileEdgeDrop(event,'${panel.id}','bottom')" ondragleave="tileEdgeLeave(event)"></div>

            <div class="tile-panel-inner">
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
            </div>

            ${!isLast ? `<div class="tile-resize-handle" data-panel-id="${panel.id}" onmousedown="tileResizeStart(event, '${panel.id}')"></div>` : ''}
        </div>
    `;
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
// ── ADD PANEL IN ROW 0 ───────────────────────────────────────────────────────

function renderAddPanelInRow() {
    const inactive = layoutGetInactive();
    if (!inactive.length) return '';
    const isOpen = model.addPanelOpen;

    const picker = isOpen ? `
        <div class="add-panel-picker">
            ${inactive.map(p => `
                <button class="add-panel-option" onclick="layoutAddPanel('${p.id}')">
                    <span class="apo-icon">${p.icon}</span>
                    <span class="apo-label">${t(p.labelKey)}</span>
                </button>
            `).join('')}
        </div>
    ` : '';

    return `
        <div class="tile-panel tile-add-panel ${isOpen ? 'open' : ''}"
             style="flex: 1 1 0%; min-width: 80px;"
             onclick="${isOpen ? '' : 'toggleAddPanel()'}">
            <div class="tile-panel-inner tile-add-inner">
                <button class="add-panel-btn ${isOpen ? 'open' : ''}"
                        onclick="event.stopPropagation(); toggleAddPanel()">
                    <span class="add-panel-cross">+</span>
                </button>
                <div class="add-panel-label ${isOpen ? '' : 'muted'}">${isOpen ? (lang === 'no' ? 'Velg panel' : 'Choose panel') : (lang === 'no' ? 'Legg til' : 'Add panel')}</div>
                ${picker}
            </div>
        </div>
    `;
}

// ── DRAG & DROP ───────────────────────────────────────────────────────────────

let _tileDragging = null;

function tileDragStart(event, id) {
    _tileDragging = id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    // Use the whole panel as drag ghost
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

function tileDragLeave(event) {
    // edges handle their own leave
}

function tileDrop(event, targetId) {
    event.preventDefault();
    event.stopPropagation();
    if (!_tileDragging || _tileDragging === targetId) return;
    // Default: drop to the right of target
    layoutMovePanel(_tileDragging, targetId, 'right');
}

// Edge-specific drag
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

// Bottom drop zone
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
    // Find the last panel in the last row and drop below it
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

    // Find current flex total
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

    const rows = model.tileLayout.map(r => r.map(c => ({...c})));
    const pos = layoutFindCell(rows, _resizeState.id);
    if (!pos) return;
    const row = rows[pos.r];
    const cell = row[pos.c];
    const neighbour = row[pos.c + 1];
    if (!neighbour) return;

    const newFlex = Math.max(0.5, _resizeState.startFlex + delta);
    const diffActual = newFlex - _resizeState.startFlex;
    const origNeighFlex = _resizeState.totalFlex - _resizeState.startFlex - row.slice(0, pos.c).reduce((s,c2,i) => {
        // just update cell and neighbour
        return s;
    }, 0);

    cell.flex = newFlex;
    // find original neighbour flex
    const origN = model.tileLayout[pos.r][pos.c + 1].flex;
    neighbour.flex = Math.max(0.5, origN - diffActual);

    model.tileLayout = rows;
    // Don't save on every mousemove — only on mouseup
    updateView();
}

function tileResizeEnd() {
    if (_resizeState) {
        layoutSave(model.tileLayout);
    }
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
    label.style.transform = 'rotate(-360deg)';
    label.style.transition = 'transform 0.5s cubic-bezier(.4,0,.2,1)';
    setTimeout(() => { label.style.transform = ''; label.style.transition = ''; }, 500);
    await resetAll();
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
