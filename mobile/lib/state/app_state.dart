import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/client.dart';
import '../i18n/strings.dart';
import '../models/board_models.dart';
import '../panels/panel_registry.dart';

/// Top-level app state. Holds the current user, the board data, the active
/// panels (which boards the user sees on home), language and theme preference.
class AppState extends ChangeNotifier {
  AppState();

  final MyBoardClient api = MyBoardClient.instance;

  // ── Session ──────────────────────────────────────────────────────────
  bool _booted = false;
  bool get booted => _booted;
  bool get isAuthed => api.isAuthed;
  String? get username => api.username;

  // ── Board ────────────────────────────────────────────────────────────
  BoardData _board = BoardData(lists: {}, tasks: []);
  BoardData get board => _board;
  bool _boardLoading = false;
  bool get boardLoading => _boardLoading;
  String? _boardError;
  String? get boardError => _boardError;

  // ── Active panels (which panels show on home) ─────────────────────────
  List<String> _activePanels = [];
  List<String> get activePanels => List.unmodifiable(_activePanels);

  // ── Locale & theme ───────────────────────────────────────────────────
  Lang _lang = Lang.en;
  Lang get lang => _lang;
  bool _dark = false;
  bool get darkMode => _dark;

  // ── Billing / access ─────────────────────────────────────────────────
  BillingStatus? _billing;
  BillingStatus? get billing => _billing;

  // ── Boot ─────────────────────────────────────────────────────────────
  Future<void> boot() async {
    final prefs = await SharedPreferences.getInstance();
    await api.loadFromStorage();
    _lang = (prefs.getString('mb_lang') == 'no') ? Lang.no : Lang.en;
    T.lang = _lang;
    _dark = prefs.getBool('mb_dark') ?? false;
    _activePanels = prefs.getStringList('mb_active_panels') ??
        kPanelRegistry.where((p) => p.defaultOn).map((p) => p.id).toList();
    _booted = true;
    notifyListeners();
  }

  Future<void> setLang(Lang l) async {
    _lang = l;
    T.lang = l;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('mb_lang', l.code);
    notifyListeners();
  }

  Future<void> toggleDark() async {
    _dark = !_dark;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('mb_dark', _dark);
    notifyListeners();
  }

  // ── Active panels management ─────────────────────────────────────────
  Future<void> setActivePanels(List<String> ids) async {
    _activePanels = ids;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('mb_active_panels', ids);
    notifyListeners();
  }

  Future<void> togglePanel(String id, {bool? on}) async {
    final next = List<String>.of(_activePanels);
    final has = next.contains(id);
    final target = on ?? !has;
    if (target && !has) {
      next.add(id);
    } else if (!target && has) {
      next.remove(id);
    }
    await setActivePanels(next);
  }

  // ── Auth ─────────────────────────────────────────────────────────────
  Future<AuthResult> login(String u, String p) async {
    final r = await api.login(u, p);
    notifyListeners();
    return r;
  }

  Future<AuthResult> register(String u, String p) async {
    final r = await api.register(u, p);
    notifyListeners();
    return r;
  }

  Future<void> logout() async {
    await api.logout();
    _board = BoardData(lists: {}, tasks: []);
    _billing = null;
    notifyListeners();
  }

  // ── Board ─────────────────────────────────────────────────────────────
  Future<void> reloadBoard() async {
    _boardLoading = true;
    _boardError = null;
    notifyListeners();
    try {
      _board = await api.getBoard();
      try {
        _billing = await api.billingStatus();
      } catch (_) {
        // billing is optional info
      }
    } on ApiException catch (e) {
      _boardError = e.message;
    } catch (e) {
      _boardError = e.toString();
    } finally {
      _boardLoading = false;
      notifyListeners();
    }
  }

  // ── Mutations (optimistic) ────────────────────────────────────────────
  List<ListItem> itemsFor(String listName) =>
      List.of(_board.lists[listName] ?? const []);

  Future<void> addListItem(String listName, String content,
      {String extra = ''}) async {
    final id = await api.addItem(listName, content, extra: extra);
    final next = List<ListItem>.of(_board.lists[listName] ?? const []);
    next.add(ListItem(id: id, value: content, extra: extra));
    _board.lists[listName] = next;
    notifyListeners();
  }

  Future<void> updateListItem(int id,
      {String? content, String? extra, bool? ischecked}) async {
    // local optimistic update
    for (final entry in _board.lists.entries) {
      for (final it in entry.value) {
        if (it.id == id) {
          if (content != null) it.value = content;
          if (extra != null) it.extra = extra;
          if (ischecked != null) it.extra = ischecked ? '1' : '0';
        }
      }
    }
    notifyListeners();
    await api.updateItem(id, content: content, extra: extra, ischecked: ischecked);
  }

  Future<void> deleteListItem(int id) async {
    for (final entry in _board.lists.entries) {
      entry.value.removeWhere((it) => it.id == id);
    }
    notifyListeners();
    await api.deleteItem(id);
  }

  Future<void> resetList(String listName) async {
    _board.lists[listName] = [];
    if (listName == 'tasks') _board.tasks.clear();
    notifyListeners();
    await api.resetList(listName);
  }

  // Tasks
  Future<void> addTask(String content) async {
    final id = await api.addTask(content);
    _board.tasks.add(TaskItem(id: id, task: content));
    notifyListeners();
  }

  Future<void> toggleTask(int id, bool checked) async {
    for (final t in _board.tasks) {
      if (t.id == id) t.ischecked = checked;
    }
    notifyListeners();
    await api.updateItem(id, ischecked: checked);
  }

  Future<void> deleteTask(int id) async {
    _board.tasks.removeWhere((t) => t.id == id);
    notifyListeners();
    await api.deleteItem(id);
  }

  Future<void> addSubtask(int taskId, String content) async {
    final id = await api.addSubtask(taskId, content);
    for (final t in _board.tasks) {
      if (t.id == taskId) t.subtasks.add(Subtask(id: id, task: content));
    }
    notifyListeners();
  }

  Future<void> toggleSubtask(int subtaskId, bool checked) async {
    for (final t in _board.tasks) {
      for (final s in t.subtasks) {
        if (s.id == subtaskId) s.ischecked = checked;
      }
    }
    notifyListeners();
    await api.toggleSubtask(subtaskId, checked);
  }

  Future<void> deleteSubtask(int subtaskId) async {
    for (final t in _board.tasks) {
      t.subtasks.removeWhere((s) => s.id == subtaskId);
    }
    notifyListeners();
    await api.deleteSubtask(subtaskId);
  }
}
