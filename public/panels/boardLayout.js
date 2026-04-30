// ── BOARD LAYOUT ──────────────────────────────────────────────────────────────
// Manages which panels are active and their order.
// Persisted in localStorage so the layout survives refreshes.
//
// model.boardLayout  = ['questions', 'Nøkkelord', 'interests', ...]  (ordered IDs)
// model.boardManage  = boolean  — is the "manage board" drawer open?

const LAYOUT_KEY = 'gnists_board_layout';

function layoutLoad() {
    try {
        const saved = localStorage.getItem(LAYOUT_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Only keep IDs that still exist in PANEL_REGISTRY
            const validIds = PANEL_REGISTRY.map(p => p.id);
            return parsed.filter(id => validIds.includes(id));
        }
    } catch (_) {}
    // Default: all panels, in registry order
    return PANEL_REGISTRY.map(p => p.id);
}

function layoutSave(ids) {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(ids));
}

function layoutGetActive() {
    return model.boardLayout
        .map(id => PANEL_REGISTRY.find(p => p.id === id))
        .filter(Boolean);
}

function layoutGetInactive() {
    return PANEL_REGISTRY.filter(p => !model.boardLayout.includes(p.id));
}

// ── ACTIONS ───────────────────────────────────────────────────────────────────

function layoutAddPanel(id) {
    if (!model.boardLayout.includes(id)) {
        model.boardLayout.push(id);
        layoutSave(model.boardLayout);
        updateView();
    }
}

function layoutRemovePanel(id) {
    model.boardLayout = model.boardLayout.filter(x => x !== id);
    layoutSave(model.boardLayout);
    updateView();
}

function layoutMovePanel(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const arr = [...model.boardLayout];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    model.boardLayout = arr;
    layoutSave(arr);
    updateView();
}

function toggleBoardManage() {
    model.boardManage = !model.boardManage;
    updateView();
}
