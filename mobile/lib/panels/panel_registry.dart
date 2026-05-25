import 'package:flutter/material.dart';

/// Panel definitions, mirrored from public/panels/panelRegistry.js.
/// Each panel has a unique [id] used as `list_name` on the server.
class PanelDef {
  const PanelDef({
    required this.id,
    required this.icon,
    required this.labelKey,
    required this.descKey,
    required this.phKey,
    required this.emptyKey,
    required this.type,
    this.defaultOn = false,
  });

  final String id;
  /// Single glyph rendered in Instrument Serif.
  final String icon;
  final String labelKey;
  final String descKey;
  final String phKey;
  final String emptyKey;
  final PanelType type;
  final bool defaultOn;
}

enum PanelType {
  simple,
  questions,
  tasks,
  reminders,
  keywords,
  shopping,
  notes,
  meals,
  bills,
  times,
  selling,
  habits,
  calendar,
}

const List<PanelDef> kPanelRegistry = [
  PanelDef(
      id: 'questions',
      icon: '?',
      labelKey: 'sec_questions',
      descKey: 'desc_questions',
      phKey: 'ph_questions',
      emptyKey: 'empty_list',
      type: PanelType.questions,
      defaultOn: true),
  PanelDef(
      id: 'interests',
      icon: '✦',
      labelKey: 'sec_interests',
      descKey: 'desc_interests',
      phKey: 'ph_interests',
      emptyKey: 'empty_list',
      type: PanelType.simple,
      defaultOn: true),
  PanelDef(
      id: 'tasks',
      icon: '✓',
      labelKey: 'sec_tasks',
      descKey: 'desc_tasks',
      phKey: 'ph_tasks',
      emptyKey: 'empty_tasks',
      type: PanelType.tasks,
      defaultOn: true),
  PanelDef(
      id: 'reminders',
      icon: '!',
      labelKey: 'sec_reminders',
      descKey: 'desc_reminders',
      phKey: 'ph_reminders',
      emptyKey: 'empty_reminders',
      type: PanelType.reminders,
      defaultOn: true),
  PanelDef(
      id: 'Nøkkelord',
      icon: '⌗',
      labelKey: 'sec_keywords',
      descKey: 'desc_keywords',
      phKey: 'ph_keywords',
      emptyKey: 'empty_keywords',
      type: PanelType.keywords),
  PanelDef(
      id: 'shopping',
      icon: '⌘',
      labelKey: 'sec_shopping',
      descKey: 'desc_shopping',
      phKey: 'ph_shopping',
      emptyKey: 'empty_shopping',
      type: PanelType.shopping),
  PanelDef(
      id: 'notes',
      icon: '§',
      labelKey: 'sec_notes',
      descKey: 'desc_notes',
      phKey: 'ph_notes',
      emptyKey: 'empty_notes',
      type: PanelType.notes),
  PanelDef(
      id: 'meals',
      icon: '~',
      labelKey: 'sec_meals',
      descKey: 'desc_meals',
      phKey: 'ph_meals',
      emptyKey: 'empty_meals',
      type: PanelType.meals),
  PanelDef(
      id: 'bills',
      icon: '\$',
      labelKey: 'sec_bills',
      descKey: 'desc_bills',
      phKey: 'ph_bills',
      emptyKey: 'empty_bills',
      type: PanelType.bills),
  PanelDef(
      id: 'times',
      icon: '◷',
      labelKey: 'sec_times',
      descKey: 'desc_times',
      phKey: 'ph_times',
      emptyKey: 'empty_times',
      type: PanelType.times),
  PanelDef(
      id: 'selling',
      icon: '#',
      labelKey: 'sec_selling',
      descKey: 'desc_selling',
      phKey: 'ph_selling',
      emptyKey: 'empty_selling',
      type: PanelType.selling),
  PanelDef(
      id: 'motivations',
      icon: '☆',
      labelKey: 'sec_motivations',
      descKey: 'desc_motivations',
      phKey: 'ph_motivations',
      emptyKey: 'empty_list',
      type: PanelType.simple),
  PanelDef(
      id: 'learningGoals',
      icon: '↗',
      labelKey: 'sec_learning',
      descKey: 'desc_learning',
      phKey: 'ph_learning',
      emptyKey: 'empty_list',
      type: PanelType.simple),
  PanelDef(
      id: 'habits',
      icon: '◇',
      labelKey: 'sec_habits',
      descKey: 'desc_habits',
      phKey: 'ph_habits',
      emptyKey: 'empty_habits',
      type: PanelType.habits),
];

PanelDef? findPanel(String id) {
  for (final p in kPanelRegistry) {
    if (p.id == id) return p;
  }
  return null;
}

@immutable
class PanelEntry {
  const PanelEntry(this.def);
  final PanelDef def;
}
