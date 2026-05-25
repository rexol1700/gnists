/// Domain models that mirror the MyBoard server's /api/data payload shape.

class ListItem {
  ListItem({required this.id, required this.value, this.extra = ''});

  final int id;
  String value;
  String extra;

  factory ListItem.fromJson(Map<String, dynamic> j) => ListItem(
        id: j['id'] as int,
        value: (j['value'] ?? '').toString(),
        extra: (j['extra'] ?? '').toString(),
      );
}

class Subtask {
  Subtask({required this.id, required this.task, this.ischecked = false});

  final int id;
  String task;
  bool ischecked;

  factory Subtask.fromJson(Map<String, dynamic> j) => Subtask(
        id: j['id'] as int,
        task: (j['task'] ?? '').toString(),
        ischecked: (j['ischecked'] == true) || (j['ischecked'] == 1),
      );
}

class TaskItem {
  TaskItem({
    required this.id,
    required this.task,
    this.ischecked = false,
    List<Subtask>? subtasks,
  }) : subtasks = subtasks ?? [];

  final int id;
  String task;
  bool ischecked;
  List<Subtask> subtasks;

  factory TaskItem.fromJson(Map<String, dynamic> j) => TaskItem(
        id: j['id'] as int,
        task: (j['task'] ?? '').toString(),
        ischecked: j['ischecked'] == true,
        subtasks: ((j['subtasks'] as List?) ?? [])
            .map((s) => Subtask.fromJson(s as Map<String, dynamic>))
            .toList(),
      );
}

class BoardData {
  BoardData({required this.lists, required this.tasks});

  /// Map of list_name → items. List names match panel ids
  /// (e.g. 'interests', 'questions', 'reminders', 'shopping', etc.)
  final Map<String, List<ListItem>> lists;
  final List<TaskItem> tasks;

  factory BoardData.fromJson(Map<String, dynamic> j) {
    final raw = (j['lists'] as Map?)?.cast<String, dynamic>() ?? {};
    final lists = <String, List<ListItem>>{};
    raw.forEach((k, v) {
      lists[k] = ((v as List?) ?? [])
          .map((it) => ListItem.fromJson(it as Map<String, dynamic>))
          .toList();
    });
    final tasks = ((j['tasks'] as List?) ?? [])
        .map((t) => TaskItem.fromJson(t as Map<String, dynamic>))
        .toList();
    return BoardData(lists: lists, tasks: tasks);
  }

  BoardData copy() => BoardData(
        lists: {for (final e in lists.entries) e.key: List.of(e.value)},
        tasks: List.of(tasks),
      );
}

class BillingStatus {
  BillingStatus({
    required this.enabled,
    required this.status,
    required this.hasAccess,
    this.currentPeriodEnd = 0,
  });

  final bool enabled; // whether paywall is configured server-side
  final String status; // grandfathered / none / trialing / active / past_due / canceled
  final bool hasAccess;
  final int currentPeriodEnd;

  factory BillingStatus.fromJson(Map<String, dynamic> j) => BillingStatus(
        enabled: (j['enabled'] as bool?) ?? false,
        status: (j['status'] as String?) ?? 'none',
        hasAccess: (j['hasAccess'] as bool?) ?? false,
        currentPeriodEnd: (j['currentPeriodEnd'] as int?) ?? 0,
      );
}
