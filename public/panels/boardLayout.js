// ── TILED BOARD LAYOUT ────────────────────────────────────────────────────────
// Hyperdynamic tiled window manager layout.
//
// model.tileLayout = array of rows. Each row = [{ id, flex }, ...]
// flex = proportional width share within the row.
//
// Row 0 is always: questions(3) + Nøkkelord(2) [+ new panels equally sized]
// New panels pop into row 0 next to Nøkkelord.
// Rows beyond 0 created by dragging a panel to the bottom drop zone.

const LAYOUT_KEY = 'gnists_tile_layout_v3';

function layoutDefault() {
    return [
        [
            { id: 'questions', flex: 3 },
            { id: 'Nøkkelord', flex: 2 },
        ]
    ];
}

function layoutLoad() {
    try {
        const saved = localStorage.getItem(LAYOUT_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            const validIds = PANEL_REGISTRY.map(p => p.id);
            const cleaned = parsed
                .map(row => row.filter(cell => validIds.includes(cell.id)))
                .filter(row => row.length > 0);
            if (cleaned.length > 0) return cleaned;
        }
    } catch (_) {}
    return layoutDefault();
}

function layoutSave(rows) {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(rows));
}

function layoutGetAllIds() {
    return model.tileLayout.flat().map(c => c.id);
}

function layoutGetInactive() {
    const active = layoutGetAllIds();
    return PANEL_REGISTRY.filter(p => !active.includes(p.id));
}

function layoutFindCell(rows, id) {
    for (let r = 0; r < rows.length; r++)
        for (let c = 0; c < rows[r].length; c++)
            if (rows[r][c].id === id) return { r, c };
    return null;
}

// Add panel: inserts next to Nøkkelord in row 0, redistributes flex
function layoutAddPanel(id) {
    if (layoutGetAllIds().includes(id)) return;
    const rows = model.tileLayout.map(r => r.map(c => ({...c})));

    const row0 = rows[0];
    const kwIdx = row0.findIndex(c => c.id === 'Nøkkelord');
    const insertAt = kwIdx >= 0 ? kwIdx + 1 : row0.length;
    row0.splice(insertAt, 0, { id, flex: 2 });

    // Rebalance: questions stays 3, others split remaining proportionally equal
    const qCell = row0.find(c => c.id === 'questions');
    if (qCell) {
        qCell.flex = 3;
        const others = row0.filter(c => c.id !== 'questions');
        const eachFlex = parseFloat((3 / others.length).toFixed(2));
        others.forEach(c => { c.flex = eachFlex; });
    }

    rows[0] = row0;
    model.tileLayout = rows;
    model.addPanelOpen = false;
    layoutSave(rows);
    updateView();
}

function layoutRemovePanel(id) {
    let rows = model.tileLayout.map(r => r.filter(c => c.id !== id));
    rows = rows.filter(r => r.length > 0);
    if (rows.length === 0) rows = layoutDefault();
    model.tileLayout = rows;
    layoutSave(rows);
    updateView();
}

// Move panel — edge: 'left'|'right'|'top'|'bottom' relative to target
function layoutMovePanel(fromId, toId, edge) {
    if (fromId === toId) return;
    let rows = model.tileLayout.map(r => r.map(c => ({...c})));

    const from = layoutFindCell(rows, fromId);
    if (!from) return;
    const fromCell = { ...rows[from.r][from.c] };

    // Remove from old position
    rows[from.r].splice(from.c, 1);
    if (rows[from.r].length === 0) rows.splice(from.r, 1);

    // Re-find target after removal
    const to = layoutFindCell(rows, toId);
    if (!to) { model.tileLayout = rows.filter(r=>r.length>0); layoutSave(model.tileLayout); updateView(); return; }

    if (edge === 'bottom') {
        const rowTotalFlex = rows[to.r].reduce((s, c) => s + c.flex, 0);
        rows.splice(to.r + 1, 0, [{ id: fromId, flex: rowTotalFlex }]);
    } else if (edge === 'top') {
        const rowTotalFlex = rows[to.r].reduce((s, c) => s + c.flex, 0);
        rows.splice(to.r, 0, [{ id: fromId, flex: rowTotalFlex }]);
    } else if (edge === 'left') {
        rows[to.r].splice(to.c, 0, { id: fromId, flex: rows[to.r][to.c].flex });
    } else {
        rows[to.r].splice(to.c + 1, 0, { id: fromId, flex: rows[to.r][to.c].flex });
    }

    model.tileLayout = rows.filter(r => r.length > 0);
    layoutSave(model.tileLayout);
    updateView();
}

// Resize panel by adjusting flex within its row
function layoutResizeFlex(id, delta) {
    const rows = model.tileLayout.map(r => r.map(c => ({...c})));
    const pos = layoutFindCell(rows, id);
    if (!pos) return;
    const row = rows[pos.r];
    const cell = row[pos.c];
    const neighbour = row[pos.c + 1] || row[pos.c - 1];
    if (!neighbour) return;
    const newFlex = Math.max(0.5, cell.flex + delta);
    const diff = newFlex - cell.flex;
    neighbour.flex = Math.max(0.5, neighbour.flex - diff);
    cell.flex = newFlex;
    model.tileLayout = rows;
    layoutSave(rows);
    updateView();
}

// Double-click panel title: expand in row (75%) or restore equal
function layoutExpandInRow(id) {
    const rows = model.tileLayout.map(r => r.map(c => ({...c})));
    const pos = layoutFindCell(rows, id);
    if (!pos) return;
    const row = rows[pos.r];
    const total = row.reduce((s, c) => s + c.flex, 0);
    const ratio = row[pos.c].flex / total;
    if (ratio > 0.7) {
        row.forEach(c => { c.flex = 1; });
    } else {
        const share = total * 0.75;
        const rest = (total - share) / (row.length - 1 || 1);
        row.forEach((c, i) => { c.flex = i === pos.c ? share : rest; });
    }
    model.tileLayout = rows;
    layoutSave(rows);
    updateView();
}

function toggleBoardManage() {
    model.boardManage = !model.boardManage;
    updateView();
}
