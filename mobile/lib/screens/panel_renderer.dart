import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../i18n/strings.dart';
import '../models/board_models.dart';
import '../panels/panel_registry.dart';
import '../state/app_state.dart';
import '../theme/mb_theme.dart';
import '../widgets/ai_button.dart';
import '../widgets/mb_input.dart';
import '../widgets/panel_shell.dart';

/// Routes a [PanelDef] to the right renderer.
class PanelRenderer extends StatelessWidget {
  const PanelRenderer({super.key, required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;

  Future<void> _confirmReset(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: context.paper2,
        title: Text(T.t('reset_confirm'),
            style: MbTheme.serif(size: 22, color: context.ink, height: 1.2)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(T.t('cancel'),
                style: MbTheme.sans(size: 14, color: context.muted)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(T.t('delete'),
                style: MbTheme.sans(size: 14, color: context.coral, weight: FontWeight.w500)),
          ),
        ],
      ),
    );
    if (ok == true) await app.resetList(panel.id);
  }

  @override
  Widget build(BuildContext context) {
    int count;
    Widget body;
    switch (panel.type) {
      case PanelType.tasks:
        count = app.board.tasks.length;
        body = _TasksBody(app: app, panel: panel);
        break;
      case PanelType.questions:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _QuestionsBody(app: app, panel: panel);
        break;
      case PanelType.keywords:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _KeywordsBody(app: app, panel: panel);
        break;
      case PanelType.shopping:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _CheckListBody(app: app, panel: panel);
        break;
      case PanelType.notes:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _NotesBody(app: app, panel: panel);
        break;
      case PanelType.meals:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _MealsBody(app: app, panel: panel);
        break;
      case PanelType.bills:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _BillsBody(app: app, panel: panel);
        break;
      case PanelType.times:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _TimesBody(app: app, panel: panel);
        break;
      case PanelType.selling:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _SellingBody(app: app, panel: panel);
        break;
      case PanelType.reminders:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _RemindersBody(app: app, panel: panel);
        break;
      case PanelType.habits:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _CheckListBody(app: app, panel: panel);
        break;
      case PanelType.calendar:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _SimpleBody(app: app, panel: panel);
        break;
      case PanelType.simple:
        count = (app.board.lists[panel.id] ?? const []).length;
        body = _SimpleBody(app: app, panel: panel);
        break;
    }
    return PanelShell(
      panel: panel,
      count: count,
      onReset: () => _confirmReset(context),
      onRemove: () => app.togglePanel(panel.id, on: false),
      child: body,
    );
  }
}

// ── Helper row chrome ───────────────────────────────────────────────────────
class _Row extends StatelessWidget {
  const _Row({required this.children, this.dotColor});
  final List<Widget> children;
  final Color? dotColor;
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: context.paper,
        border: Border.all(color: context.line),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 6, height: 6,
            margin: const EdgeInsets.only(right: 10),
            decoration: BoxDecoration(
              color: dotColor ?? MbColors.sage,
              shape: BoxShape.circle,
            ),
          ),
          ...children,
        ],
      ),
    );
  }
}

class _DeleteBtn extends StatelessWidget {
  const _DeleteBtn({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onTap,
      icon: Icon(Icons.close_rounded, size: 16, color: context.muted),
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
      tooltip: T.t('delete'),
    );
  }
}

// ── Simple list (interests, motivations, learningGoals, calendar) ──────────
class _SimpleBody extends StatelessWidget {
  const _SimpleBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  Widget build(BuildContext context) {
    final items = app.itemsFor(panel.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MbInlineInput(
          hint: T.t(panel.phKey),
          onSubmit: (v) => app.addListItem(panel.id, v),
        ),
        const SizedBox(height: 10),
        if (items.isEmpty) EmptyHint(text: T.t(panel.emptyKey)),
        ...items.map((it) => _Row(
              children: [
                Expanded(
                  child: Text(it.value,
                      style: MbTheme.sans(size: 13.5, color: context.ink2)),
                ),
                _DeleteBtn(onTap: () => app.deleteListItem(it.id)),
              ],
            )),
      ],
    );
  }
}

// ── Reminders (extra = ISO date) ─────────────────────────────────────────────
class _RemindersBody extends StatefulWidget {
  const _RemindersBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  State<_RemindersBody> createState() => _RemindersBodyState();
}

class _RemindersBodyState extends State<_RemindersBody> {
  final _ctrl = TextEditingController();
  DateTime? _date;

  Future<void> _pick() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 365 * 5)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _add() async {
    final v = _ctrl.text.trim();
    if (v.isEmpty) return;
    final extra = _date?.toIso8601String().split('T').first ?? '';
    await widget.app.addListItem(widget.panel.id, v, extra: extra);
    _ctrl.clear();
    setState(() => _date = null);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.app.itemsFor(widget.panel.id);
    final today = DateTime.now();
    DateTime? parse(String s) {
      try { return DateTime.parse(s); } catch (_) { return null; }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: context.bone,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  onSubmitted: (_) => _add(),
                  textInputAction: TextInputAction.done,
                  style: MbTheme.sans(size: 14, color: context.ink),
                  decoration: InputDecoration(
                    hintText: T.t(widget.panel.phKey),
                    hintStyle: MbTheme.sans(size: 14, color: context.muted),
                    border: InputBorder.none,
                    isCollapsed: true,
                    filled: false,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              GestureDetector(
                onTap: _pick,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  margin: const EdgeInsets.only(right: 4),
                  decoration: BoxDecoration(
                    color: context.paper2,
                    border: Border.all(color: context.line),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    _date == null ? 'Date' : '${_date!.month}/${_date!.day}',
                    style: MbTheme.mono(size: 11, color: context.muted, letterSpacing: 0.06),
                  ),
                ),
              ),
              IconButton(
                onPressed: _add,
                iconSize: 18,
                color: context.muted,
                icon: const Icon(Icons.arrow_forward_rounded),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        if (items.isEmpty) EmptyHint(text: T.t(widget.panel.emptyKey)),
        ...items.map((it) {
          final d = parse(it.extra);
          final isPast = d != null && d.isBefore(DateTime(today.year, today.month, today.day));
          final isToday = d != null &&
              d.year == today.year && d.month == today.month && d.day == today.day;
          final overdueOrToday = isPast || isToday;
          return _Row(
            dotColor: overdueOrToday ? MbColors.coral : MbColors.sage,
            children: [
              Expanded(
                child: Text(it.value,
                    style: MbTheme.sans(
                      size: 13.5,
                      color: isPast ? context.muted : context.ink2,
                      weight: isToday ? FontWeight.w500 : FontWeight.w400,
                    )),
              ),
              if (d != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: overdueOrToday ? context.coralBg : context.bone,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${d.day}/${d.month}',
                    style: MbTheme.mono(
                      size: 10,
                      color: overdueOrToday ? context.coral : context.muted,
                      letterSpacing: 0.06,
                      weight: overdueOrToday ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                ),
              ],
              _DeleteBtn(onTap: () => widget.app.deleteListItem(it.id)),
            ],
          );
        }),
      ],
    );
  }
}

// ── Tasks (with subtasks) ────────────────────────────────────────────────────
class _TasksBody extends StatefulWidget {
  const _TasksBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  State<_TasksBody> createState() => _TasksBodyState();
}

class _TasksBodyState extends State<_TasksBody> {
  final Set<int> _expanded = {};

  @override
  Widget build(BuildContext context) {
    final tasks = widget.app.board.tasks;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MbInlineInput(
          hint: T.t(widget.panel.phKey),
          onSubmit: (v) => widget.app.addTask(v),
        ),
        const SizedBox(height: 10),
        if (tasks.isEmpty) EmptyHint(text: T.t(widget.panel.emptyKey)),
        ...tasks.map((t) {
          final open = _expanded.contains(t.id);
          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            decoration: BoxDecoration(
              color: context.paper,
              border: Border.all(color: context.line),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  child: Row(
                    children: [
                      _MbCheckbox(
                        value: t.ischecked,
                        onChanged: (v) => widget.app.toggleTask(t.id, v),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          t.task,
                          style: MbTheme.sans(
                            size: 13.5,
                            color: t.ischecked ? context.muted : context.ink2,
                            weight: FontWeight.w400,
                            height: 1.4,
                          ).copyWith(
                            decoration: t.ischecked ? TextDecoration.lineThrough : null,
                            decorationColor: context.line2,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => setState(() {
                          if (open) {
                            _expanded.remove(t.id);
                          } else {
                            _expanded.add(t.id);
                          }
                        }),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                          child: Text(
                            '${t.subtasks.where((s) => s.ischecked).length}/${t.subtasks.length}',
                            style: MbTheme.mono(size: 10, color: context.muted),
                          ),
                        ),
                      ),
                      _DeleteBtn(onTap: () => widget.app.deleteTask(t.id)),
                    ],
                  ),
                ),
                if (open)
                  Container(
                    padding: const EdgeInsets.fromLTRB(38, 4, 10, 10),
                    decoration: BoxDecoration(
                      color: context.bone,
                      border: Border(top: BorderSide(color: context.line)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ...t.subtasks.map((s) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Row(
                                children: [
                                  _MbCheckbox(
                                    small: true,
                                    value: s.ischecked,
                                    onChanged: (v) => widget.app.toggleSubtask(s.id, v),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      s.task,
                                      style: MbTheme.sans(
                                        size: 12.5,
                                        color: s.ischecked ? context.muted : context.ink2,
                                      ).copyWith(
                                        decoration: s.ischecked ? TextDecoration.lineThrough : null,
                                      ),
                                    ),
                                  ),
                                  _DeleteBtn(onTap: () => widget.app.deleteSubtask(s.id)),
                                ],
                              ),
                            )),
                        const SizedBox(height: 6),
                        MbInlineInput(
                          hint: T.t('ph_subtask'),
                          onSubmit: (v) => widget.app.addSubtask(t.id, v),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _MbCheckbox extends StatelessWidget {
  const _MbCheckbox({required this.value, required this.onChanged, this.small = false});
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool small;
  @override
  Widget build(BuildContext context) {
    final side = small ? 14.0 : 18.0;
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 100),
        width: side, height: side,
        decoration: BoxDecoration(
          color: value ? context.ink : context.paper2,
          border: Border.all(color: value ? context.ink : context.line2, width: 1.5),
          borderRadius: BorderRadius.circular(small ? 4 : 5),
        ),
        child: value
            ? Icon(Icons.check_rounded, size: small ? 10 : 12, color: context.paper)
            : null,
      ),
    );
  }
}

// ── Questions (with AI answer) ──────────────────────────────────────────────
class _QuestionsBody extends StatefulWidget {
  const _QuestionsBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  State<_QuestionsBody> createState() => _QuestionsBodyState();
}

class _QuestionsBodyState extends State<_QuestionsBody> {
  final Set<int> _open = {};

  @override
  Widget build(BuildContext context) {
    final items = widget.app.itemsFor(widget.panel.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MbInlineInput(
          hint: T.t(widget.panel.phKey),
          onSubmit: (v) => widget.app.addListItem(widget.panel.id, v),
        ),
        const SizedBox(height: 10),
        if (items.isEmpty) EmptyHint(text: T.t(widget.panel.emptyKey)),
        ...items.map((it) {
          final open = _open.contains(it.id);
          final hasAnswer = it.extra.trim().isNotEmpty;
          return AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            margin: const EdgeInsets.only(bottom: 6),
            decoration: BoxDecoration(
              color: open ? context.sageBg : context.paper,
              border: Border.all(color: open ? MbColors.sage : context.line),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(12, 10, 8, hasAnswer || open ? 6 : 10),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: hasAnswer
                              ? () => setState(() {
                                    if (open) {
                                      _open.remove(it.id);
                                    } else {
                                      _open.add(it.id);
                                    }
                                  })
                              : null,
                          child: Text(
                            it.value,
                            style: MbTheme.serif(
                              size: 15, color: context.ink, height: 1.4,
                            ),
                          ),
                        ),
                      ),
                      AiButton(
                        app: widget.app,
                        kind: 'answer',
                        text: it.value,
                        onResult: (text) async {
                          await widget.app.updateListItem(it.id, extra: text);
                          setState(() => _open.add(it.id));
                        },
                      ),
                      _DeleteBtn(onTap: () => widget.app.deleteListItem(it.id)),
                    ],
                  ),
                ),
                if (hasAnswer && open)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                    child: MarkdownBody(
                      data: it.extra,
                      styleSheet: _markdownStyle(context),
                    ),
                  ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

MarkdownStyleSheet _markdownStyle(BuildContext context) {
  return MarkdownStyleSheet(
    p: MbTheme.serif(size: 14, color: context.ink, height: 1.55),
    h2: MbTheme.serif(size: 16, color: context.ink, weight: FontWeight.w600, height: 1.3),
    h3: MbTheme.serif(size: 15, color: context.ink, weight: FontWeight.w600, height: 1.3),
    em: MbTheme.serif(size: 14, color: context.ink, style: FontStyle.italic, height: 1.55),
    strong: MbTheme.serif(size: 14, color: context.ink, weight: FontWeight.w600, height: 1.55),
    code: MbTheme.mono(size: 12, color: context.ink),
    listBullet: MbTheme.serif(size: 14, color: context.ink, height: 1.55),
    a: MbTheme.serif(size: 14, color: MbColors.sage, height: 1.55).copyWith(
      decoration: TextDecoration.underline,
    ),
  );
}

// ── Keywords (with AI define) ───────────────────────────────────────────────
class _KeywordsBody extends StatefulWidget {
  const _KeywordsBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  State<_KeywordsBody> createState() => _KeywordsBodyState();
}

class _KeywordsBodyState extends State<_KeywordsBody> {
  final Set<int> _open = {};

  @override
  Widget build(BuildContext context) {
    final items = widget.app.itemsFor(widget.panel.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MbInlineInput(
          hint: T.t(widget.panel.phKey),
          onSubmit: (v) => widget.app.addListItem(widget.panel.id, v),
        ),
        const SizedBox(height: 10),
        if (items.isEmpty) EmptyHint(text: T.t(widget.panel.emptyKey)),
        ...items.map((it) {
          final open = _open.contains(it.id);
          return Container(
            margin: const EdgeInsets.only(bottom: 4),
            decoration: BoxDecoration(
              color: open ? context.sageBg : context.paper,
              border: Border(bottom: BorderSide(color: context.line)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                InkWell(
                  onTap: () => setState(() {
                    if (open) {
                      _open.remove(it.id);
                    } else {
                      _open.add(it.id);
                    }
                  }),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(10, 10, 8, 10),
                    child: Row(
                      children: [
                        Container(
                          width: 5, height: 5,
                          margin: const EdgeInsets.only(right: 10),
                          decoration: BoxDecoration(
                            color: MbColors.sage,
                            shape: BoxShape.circle,
                            boxShadow: open
                                ? [BoxShadow(color: context.sageBg, spreadRadius: 3)]
                                : null,
                          ),
                        ),
                        Text(it.value,
                            style: MbTheme.serif(
                              size: 16, color: context.ink,
                              style: FontStyle.italic, height: 1,
                            )),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            it.extra,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: MbTheme.serif(
                              size: 13, color: context.muted, style: FontStyle.italic,
                            ),
                          ),
                        ),
                        AiButton(
                          app: widget.app,
                          kind: 'define',
                          text: it.value,
                          onResult: (text) async {
                            await widget.app.updateListItem(it.id, extra: text);
                            setState(() => _open.add(it.id));
                          },
                        ),
                        _DeleteBtn(onTap: () => widget.app.deleteListItem(it.id)),
                      ],
                    ),
                  ),
                ),
                if (open)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 12, 10),
                    child: _MeaningEditor(
                      app: widget.app,
                      itemId: it.id,
                      initial: it.extra,
                    ),
                  ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _MeaningEditor extends StatefulWidget {
  const _MeaningEditor({required this.app, required this.itemId, required this.initial});
  final AppState app;
  final int itemId;
  final String initial;
  @override
  State<_MeaningEditor> createState() => _MeaningEditorState();
}

class _MeaningEditorState extends State<_MeaningEditor> {
  late final _ctrl = TextEditingController(text: widget.initial);
  @override
  void didUpdateWidget(covariant _MeaningEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initial != oldWidget.initial && widget.initial != _ctrl.text) {
      _ctrl.text = widget.initial;
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _ctrl,
      maxLines: null,
      onSubmitted: (v) => widget.app.updateListItem(widget.itemId, extra: v.trim()),
      onEditingComplete: () {
        widget.app.updateListItem(widget.itemId, extra: _ctrl.text.trim());
      },
      style: MbTheme.serif(size: 13, color: context.ink, style: FontStyle.italic, height: 1.55),
      decoration: InputDecoration(
        hintText: T.t('keyword_meaning_ph'),
        hintStyle: MbTheme.serif(size: 13, color: context.muted, style: FontStyle.italic),
        filled: true,
        fillColor: context.paper,
        contentPadding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: context.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: context.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: MbColors.sage, width: 2),
        ),
      ),
    );
  }
}

// ── Check-list (shopping, habits) ───────────────────────────────────────────
class _CheckListBody extends StatelessWidget {
  const _CheckListBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  Widget build(BuildContext context) {
    final items = app.itemsFor(panel.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MbInlineInput(
          hint: T.t(panel.phKey),
          onSubmit: (v) => app.addListItem(panel.id, v, extra: '0'),
        ),
        const SizedBox(height: 10),
        if (items.isEmpty) EmptyHint(text: T.t(panel.emptyKey)),
        ...items.map((it) {
          final checked = it.extra == '1';
          return _Row(
            dotColor: Colors.transparent,
            children: [
              _MbCheckbox(
                value: checked,
                onChanged: (v) => app.updateListItem(it.id, ischecked: v),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  it.value,
                  style: MbTheme.sans(
                    size: 13.5,
                    color: checked ? context.muted : context.ink2,
                  ).copyWith(
                    decoration: checked ? TextDecoration.lineThrough : null,
                  ),
                ),
              ),
              _DeleteBtn(onTap: () => app.deleteListItem(it.id)),
            ],
          );
        }),
      ],
    );
  }
}

// ── Notes (title + body in extra) ───────────────────────────────────────────
class _NotesBody extends StatefulWidget {
  const _NotesBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  State<_NotesBody> createState() => _NotesBodyState();
}

class _NotesBodyState extends State<_NotesBody> {
  final Set<int> _open = {};
  final Map<int, TextEditingController> _controllers = {};

  TextEditingController _ctrlFor(ListItem it) {
    return _controllers.putIfAbsent(it.id, () => TextEditingController(text: it.extra));
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.app.itemsFor(widget.panel.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MbInlineInput(
          hint: T.t(widget.panel.phKey),
          onSubmit: (v) => widget.app.addListItem(widget.panel.id, v),
        ),
        const SizedBox(height: 10),
        if (items.isEmpty) EmptyHint(text: T.t(widget.panel.emptyKey)),
        ...items.map((it) {
          final open = _open.contains(it.id);
          final ctrl = _ctrlFor(it);
          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            decoration: BoxDecoration(
              color: context.paper,
              border: Border.all(color: context.line),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                InkWell(
                  onTap: () => setState(() {
                    if (open) {
                      _open.remove(it.id);
                    } else {
                      _open.add(it.id);
                    }
                  }),
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(it.value,
                              style: MbTheme.sans(
                                size: 14, weight: FontWeight.w500, color: context.ink,
                              )),
                        ),
                        Icon(
                          open ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                          size: 18, color: context.muted,
                        ),
                        _DeleteBtn(onTap: () => widget.app.deleteListItem(it.id)),
                      ],
                    ),
                  ),
                ),
                if (!open && it.extra.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                    child: Text(
                      it.extra,
                      maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: MbTheme.serif(
                        size: 12, color: context.muted,
                        style: FontStyle.italic, height: 1.4,
                      ),
                    ),
                  ),
                if (open)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                    child: TextField(
                      controller: ctrl,
                      maxLines: null,
                      minLines: 3,
                      onEditingComplete: () => widget.app.updateListItem(it.id, extra: ctrl.text.trim()),
                      onSubmitted: (v) => widget.app.updateListItem(it.id, extra: v.trim()),
                      onTapOutside: (_) {
                        widget.app.updateListItem(it.id, extra: ctrl.text.trim());
                      },
                      style: MbTheme.serif(
                        size: 14, color: context.ink, height: 1.55,
                      ),
                      decoration: InputDecoration(
                        hintText: T.t('note_body_ph'),
                        hintStyle: MbTheme.serif(
                          size: 14, color: context.muted, style: FontStyle.italic,
                        ),
                        filled: true,
                        fillColor: context.paper2,
                        contentPadding: const EdgeInsets.all(10),
                      ),
                    ),
                  ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

// ── Bills (extra = "amount|dueDate") ────────────────────────────────────────
class _BillsBody extends StatefulWidget {
  const _BillsBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  State<_BillsBody> createState() => _BillsBodyState();
}

class _BillsBodyState extends State<_BillsBody> {
  final _name = TextEditingController();
  final _amount = TextEditingController();
  DateTime? _date;

  @override
  void dispose() {
    _name.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final n = _name.text.trim();
    if (n.isEmpty) return;
    final dStr = _date?.toIso8601String().split('T').first ?? '';
    final extra = '${_amount.text.trim()}|$dStr';
    await widget.app.addListItem(widget.panel.id, n, extra: extra);
    _name.clear();
    _amount.clear();
    setState(() => _date = null);
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 365 * 5)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.app.itemsFor(widget.panel.id);
    final today = DateTime.now();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              flex: 3,
              child: _MiniField(controller: _name, hint: T.t(widget.panel.phKey)),
            ),
            const SizedBox(width: 6),
            Expanded(
              flex: 2,
              child: _MiniField(
                controller: _amount, hint: T.t('bill_amount'),
                keyboardType: TextInputType.number,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: _pickDate,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                  decoration: BoxDecoration(
                    color: context.bone,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _date == null
                        ? T.t('bill_due')
                        : '${_date!.year}-${_date!.month.toString().padLeft(2, '0')}-${_date!.day.toString().padLeft(2, '0')}',
                    style: MbTheme.sans(size: 14, color: _date == null ? context.muted : context.ink),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: _add,
              child: Container(
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: context.ink,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Text(T.t('add'),
                    style: MbTheme.sans(
                      size: 13, weight: FontWeight.w500, color: context.paper, height: 1,
                    )),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (items.isEmpty) EmptyHint(text: T.t(widget.panel.emptyKey)),
        ...items.map((it) {
          final parts = it.extra.split('|');
          final amount = parts.isNotEmpty ? parts[0] : '';
          DateTime? due;
          if (parts.length > 1 && parts[1].isNotEmpty) {
            try { due = DateTime.parse(parts[1]); } catch (_) {}
          }
          final overdue = due != null && due.isBefore(DateTime(today.year, today.month, today.day));
          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: overdue ? context.coralBg : context.paper,
              border: Border.all(color: overdue ? MbColors.coral : context.line),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Container(
                  width: 6, height: 6,
                  margin: const EdgeInsets.only(right: 10),
                  decoration: BoxDecoration(
                    color: overdue ? MbColors.coral : MbColors.sage,
                    shape: BoxShape.circle,
                  ),
                ),
                Expanded(
                  child: Text(it.value,
                      style: MbTheme.sans(size: 13.5, color: context.ink2)),
                ),
                if (amount.isNotEmpty) ...[
                  Text(amount,
                      style: MbTheme.mono(size: 11, color: context.muted)),
                  const SizedBox(width: 8),
                ],
                if (due != null)
                  Text(
                    '${due.day}/${due.month}',
                    style: MbTheme.mono(
                      size: 10,
                      color: overdue ? MbColors.coral : context.muted,
                      weight: overdue ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                _DeleteBtn(onTap: () => widget.app.deleteListItem(it.id)),
              ],
            ),
          );
        }),
      ],
    );
  }
}

// ── Times (extra = "HH:MM|recurrence") ──────────────────────────────────────
class _TimesBody extends StatefulWidget {
  const _TimesBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  State<_TimesBody> createState() => _TimesBodyState();
}

class _TimesBodyState extends State<_TimesBody> {
  final _what = TextEditingController();
  TimeOfDay? _time;
  String _every = 'daily';

  @override
  void dispose() {
    _what.dispose();
    super.dispose();
  }

  Future<void> _pickTime() async {
    final t = await showTimePicker(context: context, initialTime: TimeOfDay.now());
    if (t != null) setState(() => _time = t);
  }

  Future<void> _add() async {
    final v = _what.text.trim();
    if (v.isEmpty || _time == null) return;
    final extra = '${_time!.hour.toString().padLeft(2, '0')}:${_time!.minute.toString().padLeft(2, '0')}|$_every';
    await widget.app.addListItem(widget.panel.id, v, extra: extra);
    _what.clear();
    setState(() => _time = null);
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.app.itemsFor(widget.panel.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _MiniField(controller: _what, hint: T.t(widget.panel.phKey)),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: _pickTime,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                  decoration: BoxDecoration(
                    color: context.bone,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _time == null
                        ? T.t('time_at')
                        : '${_time!.hour.toString().padLeft(2, '0')}:${_time!.minute.toString().padLeft(2, '0')}',
                    style: MbTheme.sans(
                      size: 14, color: _time == null ? context.muted : context.ink,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: context.bone,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: DropdownButton<String>(
                  value: _every,
                  isExpanded: true,
                  underline: const SizedBox.shrink(),
                  dropdownColor: context.paper2,
                  style: MbTheme.sans(size: 14, color: context.ink),
                  items: const [
                    DropdownMenuItem(value: 'daily', child: Text('Daily')),
                    DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                    DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                  ],
                  onChanged: (v) => setState(() => _every = v ?? 'daily'),
                ),
              ),
            ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: _add,
              child: Container(
                height: 40, width: 40,
                decoration: BoxDecoration(
                  color: context.ink,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Icon(Icons.add_rounded, size: 18, color: context.paper),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (items.isEmpty) EmptyHint(text: T.t(widget.panel.emptyKey)),
        ...items.map((it) {
          final parts = it.extra.split('|');
          final time = parts.isNotEmpty ? parts[0] : '';
          final rec = parts.length > 1 ? parts[1] : '';
          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: context.paper,
              border: Border.all(color: context.line),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: context.ink,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(time,
                      style: MbTheme.mono(
                        size: 11, color: context.paper, letterSpacing: 0.03,
                      )),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(it.value,
                      style: MbTheme.sans(size: 13.5, color: context.ink2)),
                ),
                if (rec.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: context.bone,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      rec.toUpperCase(),
                      style: MbTheme.mono(size: 9, color: context.muted, letterSpacing: 0.06),
                    ),
                  ),
                _DeleteBtn(onTap: () => widget.app.deleteListItem(it.id)),
              ],
            ),
          );
        }),
      ],
    );
  }
}

// ── Selling (extra = "price|status") ────────────────────────────────────────
class _SellingBody extends StatefulWidget {
  const _SellingBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  State<_SellingBody> createState() => _SellingBodyState();
}

class _SellingBodyState extends State<_SellingBody> {
  final _name = TextEditingController();
  final _price = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final n = _name.text.trim();
    if (n.isEmpty) return;
    final extra = '${_price.text.trim()}|listed';
    await widget.app.addListItem(widget.panel.id, n, extra: extra);
    _name.clear();
    _price.clear();
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.app.itemsFor(widget.panel.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(flex: 3, child: _MiniField(controller: _name, hint: T.t(widget.panel.phKey))),
            const SizedBox(width: 6),
            Expanded(
              flex: 2,
              child: _MiniField(
                controller: _price, hint: T.t('selling_price'),
                keyboardType: TextInputType.number,
              ),
            ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: _add,
              child: Container(
                height: 40, width: 40,
                decoration: BoxDecoration(
                  color: context.ink,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Icon(Icons.add_rounded, size: 18, color: context.paper),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (items.isEmpty) EmptyHint(text: T.t(widget.panel.emptyKey)),
        ...items.map((it) {
          final parts = it.extra.split('|');
          final price = parts.isNotEmpty ? parts[0] : '';
          final status = parts.length > 1 ? parts[1] : 'listed';
          final sold = status == 'sold';
          return _Row(
            dotColor: sold ? context.muted : (status == 'pending' ? MbColors.coral : MbColors.sage),
            children: [
              Expanded(
                child: Text(
                  it.value,
                  style: MbTheme.sans(
                    size: 13.5,
                    color: sold ? context.muted : context.ink2,
                  ).copyWith(
                    decoration: sold ? TextDecoration.lineThrough : null,
                  ),
                ),
              ),
              if (price.isNotEmpty) ...[
                Text(price, style: MbTheme.mono(size: 11, color: context.muted)),
                const SizedBox(width: 8),
              ],
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                decoration: BoxDecoration(
                  color: context.bone,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: context.line),
                ),
                child: DropdownButton<String>(
                  value: status,
                  underline: const SizedBox.shrink(),
                  isDense: true,
                  iconSize: 14,
                  dropdownColor: context.paper2,
                  style: MbTheme.sans(size: 11, color: context.ink2),
                  items: [
                    DropdownMenuItem(value: 'listed', child: Text(T.t('selling_status_listed'))),
                    DropdownMenuItem(value: 'pending', child: Text(T.t('selling_status_pending'))),
                    DropdownMenuItem(value: 'sold', child: Text(T.t('selling_status_sold'))),
                  ],
                  onChanged: (v) {
                    if (v == null) return;
                    widget.app.updateListItem(it.id, extra: '$price|$v');
                  },
                ),
              ),
              _DeleteBtn(onTap: () => widget.app.deleteListItem(it.id)),
            ],
          );
        }),
      ],
    );
  }
}

// ── Meals (name + JSON-ish extra: "ingredients\\ninstructions::MARKDOWN") ───
class _MealsBody extends StatefulWidget {
  const _MealsBody({required this.app, required this.panel});
  final AppState app;
  final PanelDef panel;
  @override
  State<_MealsBody> createState() => _MealsBodyState();
}

class _MealsBodyState extends State<_MealsBody> {
  final Set<int> _open = {};

  // Extra serialization: "<ingredient lines>\n=INSTR=\n<markdown>"
  static const _delim = '\n=INSTR=\n';

  ({List<String> ingredients, String instructions}) _parse(String extra) {
    final idx = extra.indexOf(_delim);
    if (idx == -1) {
      return (
        ingredients: extra.split('\n').where((l) => l.trim().isNotEmpty).toList(),
        instructions: '',
      );
    }
    final ing = extra.substring(0, idx).split('\n').where((l) => l.trim().isNotEmpty).toList();
    final instr = extra.substring(idx + _delim.length);
    return (ingredients: ing, instructions: instr);
  }

  String _serialize(List<String> ingredients, String instructions) {
    return '${ingredients.join('\n')}$_delim$instructions';
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.app.itemsFor(widget.panel.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MbInlineInput(
          hint: T.t(widget.panel.phKey),
          onSubmit: (v) => widget.app.addListItem(widget.panel.id, v),
        ),
        const SizedBox(height: 10),
        if (items.isEmpty) EmptyHint(text: T.t(widget.panel.emptyKey)),
        ...items.map((it) {
          final open = _open.contains(it.id);
          final parsed = _parse(it.extra);
          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            decoration: BoxDecoration(
              color: context.paper,
              border: Border.all(color: open ? context.ink : context.line),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                InkWell(
                  onTap: () => setState(() {
                    if (open) {
                      _open.remove(it.id);
                    } else {
                      _open.add(it.id);
                    }
                  }),
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(it.value,
                              style: MbTheme.sans(
                                size: 14, color: context.ink, weight: FontWeight.w500,
                              )),
                        ),
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: context.bone,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text('${parsed.ingredients.length} ing',
                              style: MbTheme.mono(size: 10, color: context.muted)),
                        ),
                        Icon(
                          open ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                          size: 18, color: context.muted,
                        ),
                        _DeleteBtn(onTap: () => widget.app.deleteListItem(it.id)),
                      ],
                    ),
                  ),
                ),
                if (open)
                  _MealEditor(
                    app: widget.app,
                    item: it,
                    parsed: parsed,
                    onSave: (ings, instr) {
                      widget.app.updateListItem(it.id, extra: _serialize(ings, instr));
                    },
                  ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _MealEditor extends StatefulWidget {
  const _MealEditor({
    required this.app,
    required this.item,
    required this.parsed,
    required this.onSave,
  });
  final AppState app;
  final ListItem item;
  final ({List<String> ingredients, String instructions}) parsed;
  final void Function(List<String>, String) onSave;

  @override
  State<_MealEditor> createState() => _MealEditorState();
}

class _MealEditorState extends State<_MealEditor> {
  late List<String> _ings = List.of(widget.parsed.ingredients);
  late final TextEditingController _instr = TextEditingController(text: widget.parsed.instructions);
  final _addCtrl = TextEditingController();
  int _tab = 0;

  @override
  void dispose() {
    _instr.dispose();
    _addCtrl.dispose();
    super.dispose();
  }

  void _save() => widget.onSave(_ings, _instr.text);

  void _addIng(String v) {
    final t = v.trim();
    if (t.isEmpty) return;
    setState(() {
      _ings.add(t);
      _addCtrl.clear();
    });
    _save();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.paper2,
        border: Border(top: BorderSide(color: context.line)),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(10), bottomRight: Radius.circular(10),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _tabBtn(0, T.t('meal_ingredients')),
              _tabBtn(1, T.t('meal_instructions')),
            ],
          ),
          if (_tab == 0)
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ..._ings.asMap().entries.map((e) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          children: [
                            Container(
                              width: 4, height: 4,
                              margin: const EdgeInsets.only(right: 10),
                              decoration: const BoxDecoration(color: MbColors.sage, shape: BoxShape.circle),
                            ),
                            Expanded(
                              child: Text(e.value,
                                  style: MbTheme.sans(size: 13, color: context.ink2)),
                            ),
                            IconButton(
                              onPressed: () {
                                setState(() => _ings.removeAt(e.key));
                                _save();
                              },
                              icon: Icon(Icons.close, size: 14, color: context.muted),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
                            ),
                          ],
                        ),
                      )),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: MbInlineInput(
                          controller: _addCtrl,
                          hint: T.t('meal_add_ingredient'),
                          onSubmit: _addIng,
                        ),
                      ),
                      const SizedBox(width: 6),
                      AiButton(
                        app: widget.app,
                        kind: 'ingredients',
                        text: widget.item.value,
                        onResult: (out) {
                          final lines = out.split('\n').map((l) => l.trim()).where((l) => l.isNotEmpty).toList();
                          setState(() => _ings.addAll(lines));
                          _save();
                        },
                      ),
                    ],
                  ),
                ],
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: Alignment.centerRight,
                    child: AiButton(
                      app: widget.app,
                      kind: 'instructions',
                      text: '${widget.item.value}\n${_ings.join('\n')}',
                      onResult: (out) {
                        setState(() => _instr.text = out);
                        _save();
                      },
                    ),
                  ),
                  TextField(
                    controller: _instr,
                    maxLines: null, minLines: 4,
                    onEditingComplete: _save,
                    onTapOutside: (_) => _save(),
                    style: MbTheme.serif(size: 14, color: context.ink, height: 1.55),
                    decoration: InputDecoration(
                      hintText: T.t('meal_instr_ph'),
                      hintStyle: MbTheme.serif(
                        size: 14, color: context.muted, style: FontStyle.italic,
                      ),
                      filled: true,
                      fillColor: context.paper,
                      contentPadding: const EdgeInsets.all(10),
                    ),
                  ),
                  if (_instr.text.trim().isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: MarkdownBody(
                        data: _instr.text,
                        styleSheet: _markdownStyle(context),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _tabBtn(int i, String label) {
    final on = _tab == i;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _tab = i),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: on ? context.ink : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: MbTheme.sans(
              size: 12,
              color: on ? context.ink : context.muted,
              weight: on ? FontWeight.w500 : FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }
}

class _MiniField extends StatelessWidget {
  const _MiniField({required this.controller, required this.hint, this.keyboardType});
  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboardType;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: context.bone,
        borderRadius: BorderRadius.circular(10),
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: MbTheme.sans(size: 14, color: context.ink),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: MbTheme.sans(size: 14, color: context.muted),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          isCollapsed: true,
          filled: false,
          contentPadding: const EdgeInsets.symmetric(vertical: 11),
        ),
      ),
    );
  }
}
