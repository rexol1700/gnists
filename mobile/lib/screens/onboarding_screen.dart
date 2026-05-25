import 'package:flutter/material.dart';

import '../i18n/strings.dart';
import '../panels/panel_registry.dart';
import '../state/app_state.dart';
import '../theme/mb_theme.dart';
import '../widgets/mb_button.dart';
import 'home_screen.dart';

/// 4-step onboarding, mirroring the web onboardingView. Steps:
/// 1) welcome  2) pick boards  3) first spark  4) ready
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({required this.app});
  final AppState app;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _step = 0;
  late Set<String> _selected;
  final _spark = TextEditingController();
  String _sparkTarget = 'questions';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selected = kPanelRegistry.where((p) => p.defaultOn).map((p) => p.id).toSet();
  }

  @override
  void dispose() {
    _spark.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    setState(() => _saving = true);
    try {
      await widget.app.setActivePanels(_selected.toList());
      final s = _spark.text.trim();
      if (s.isNotEmpty) {
        try {
          await widget.app.api.addItem(_sparkTarget, s);
        } catch (_) {}
      }
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => HomeScreen(app: widget.app)),
        (_) => false,
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _step == 3;
    return Scaffold(
      backgroundColor: context.paper,
      body: SafeArea(
        child: Column(
          children: [
            _TopBar(step: _step, total: 4, onSkip: _finish),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: KeyedSubtree(
                  key: ValueKey(_step),
                  child: _stepBody(),
                ),
              ),
            ),
            _BottomBar(
              showBack: _step > 0,
              onBack: () => setState(() => _step -= 1),
              nextLabel: isLast ? T.t('open_board') : T.t('next'),
              busy: _saving,
              onNext: isLast
                  ? _finish
                  : () {
                      setState(() => _step += 1);
                    },
              nextEnabled: _step != 1 || _selected.isNotEmpty,
            ),
          ],
        ),
      ),
    );
  }

  Widget _stepBody() {
    switch (_step) {
      case 0:
        return _StepWelcome();
      case 1:
        return _StepBoards(
          selected: _selected,
          onToggle: (id) => setState(() {
            if (_selected.contains(id)) {
              _selected.remove(id);
            } else {
              _selected.add(id);
            }
          }),
        );
      case 2:
        return _StepSpark(
          ctrl: _spark,
          target: _sparkTarget,
          targets: _selected.where((id) {
            final p = findPanel(id);
            return p != null && (p.type == PanelType.simple || p.type == PanelType.questions);
          }).toList(),
          onTarget: (v) => setState(() => _sparkTarget = v),
        );
      case 3:
      default:
        return _StepReady(selected: _selected.toList());
    }
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.step, required this.total, required this.onSkip});
  final int step;
  final int total;
  final VoidCallback onSkip;
  @override
  Widget build(BuildContext context) {
    final pct = (step + 1) / total;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
      child: Row(
        children: [
          Text(
            '${T.t('ob_step').toUpperCase()} ${step + 1} ${T.t('ob_of').toUpperCase()} $total',
            style: MbTheme.mono(size: 11, color: context.muted, letterSpacing: 0.12),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Container(
              height: 3,
              decoration: BoxDecoration(
                color: context.line,
                borderRadius: BorderRadius.circular(2),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: pct,
                child: Container(
                  decoration: BoxDecoration(
                    color: context.ink,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          GestureDetector(
            onTap: onSkip,
            child: Text(
              T.t('skip'),
              style: MbTheme.sans(size: 13, color: context.muted),
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.showBack,
    required this.onBack,
    required this.nextLabel,
    required this.onNext,
    this.nextEnabled = true,
    this.busy = false,
  });
  final bool showBack;
  final VoidCallback onBack;
  final String nextLabel;
  final VoidCallback onNext;
  final bool nextEnabled;
  final bool busy;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: context.line)),
        color: context.paper,
      ),
      child: Row(
        children: [
          if (showBack)
            MbButton(label: T.t('back'), ghost: true, onTap: onBack)
          else
            const SizedBox.shrink(),
          const Spacer(),
          MbButton(
            label: nextLabel,
            onTap: nextEnabled ? onNext : null,
            busy: busy,
            trailing: const Icon(Icons.arrow_forward_rounded, size: 16),
          ),
        ],
      ),
    );
  }
}

class _StepWelcome extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(T.t('ob_welcome'),
                style: MbTheme.mono(size: 11, color: context.muted, letterSpacing: 0.12)),
            const SizedBox(height: 10),
            Text.rich(
              TextSpan(
                style: MbTheme.serif(size: 56, color: context.ink, height: 0.98),
                children: [
                  const TextSpan(text: 'My'),
                  TextSpan(
                    text: 'Board',
                    style: MbTheme.serif(
                      size: 56, color: MbColors.sage,
                      style: FontStyle.italic, height: 0.98,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Text(
                T.t('app_blurb'),
                style: MbTheme.serif(
                  size: 18, color: context.ink2, style: FontStyle.italic, height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepBoards extends StatelessWidget {
  const _StepBoards({required this.selected, required this.onToggle});
  final Set<String> selected;
  final ValueChanged<String> onToggle;
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 6),
          Text(T.t('ob_pick_boards'),
              style: MbTheme.serif(size: 32, color: context.ink, height: 1.1)),
          const SizedBox(height: 8),
          Text(T.t('ob_pick_hint'),
              style: MbTheme.serif(
                size: 16, color: context.ink2, style: FontStyle.italic, height: 1.4,
              )),
          const SizedBox(height: 20),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: kPanelRegistry.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.55,
            ),
            itemBuilder: (_, i) {
              final p = kPanelRegistry[i];
              final on = selected.contains(p.id);
              return GestureDetector(
                onTap: () => onToggle(p.id),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
                  decoration: BoxDecoration(
                    color: context.paper2,
                    border: Border.all(
                      color: on ? context.ink : context.line,
                      width: on ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Stack(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 28, height: 28,
                            decoration: BoxDecoration(
                              color: on ? context.sageBg : context.bone,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: Text(p.icon,
                                style: MbTheme.serif(
                                  size: 14,
                                  color: on ? MbColors.sage : context.ink,
                                  height: 1,
                                )),
                          ),
                          const SizedBox(height: 8),
                          Text(T.t(p.labelKey),
                              style: MbTheme.sans(
                                size: 13, weight: FontWeight.w500, color: context.ink, height: 1.1,
                              )),
                          const SizedBox(height: 2),
                          Flexible(
                            child: Text(T.t(p.descKey),
                                maxLines: 2, overflow: TextOverflow.ellipsis,
                                style: MbTheme.sans(
                                  size: 11, color: context.muted, height: 1.3,
                                )),
                          ),
                        ],
                      ),
                      Positioned(
                        top: 0, right: 0,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          width: 18, height: 18,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: on ? context.ink : context.paper2,
                            border: Border.all(color: on ? context.ink : context.line2),
                          ),
                          child: on
                              ? Icon(Icons.check, size: 12, color: context.paper)
                              : null,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

class _StepSpark extends StatelessWidget {
  const _StepSpark({
    required this.ctrl,
    required this.target,
    required this.targets,
    required this.onTarget,
  });
  final TextEditingController ctrl;
  final String target;
  final List<String> targets;
  final ValueChanged<String> onTarget;
  @override
  Widget build(BuildContext context) {
    final safeTarget = targets.contains(target) ? target : (targets.isNotEmpty ? targets.first : 'questions');
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          Text(T.t('ob_first_spark'),
              style: MbTheme.serif(size: 36, color: context.ink, height: 1.0)),
          const SizedBox(height: 8),
          Text(T.t('ob_first_spark_hint'),
              style: MbTheme.serif(
                size: 17, color: context.ink2, style: FontStyle.italic, height: 1.4,
              )),
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
            decoration: BoxDecoration(
              color: context.paper2,
              border: Border.all(color: context.line),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: ctrl,
                  maxLines: 4,
                  style: MbTheme.serif(
                    size: 22, color: context.ink, height: 1.3,
                  ),
                  decoration: InputDecoration(
                    hintText: '…',
                    hintStyle: MbTheme.serif(
                      size: 22, color: context.muted, style: FontStyle.italic, height: 1.3,
                    ),
                    border: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    filled: false,
                    contentPadding: EdgeInsets.zero,
                    isCollapsed: true,
                  ),
                ),
                const SizedBox(height: 8),
                Divider(color: context.line, height: 12),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text('SAVE TO →',
                        style: MbTheme.mono(size: 10, color: context.muted, letterSpacing: 0.10)),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: context.bone,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: DropdownButton<String>(
                        value: safeTarget,
                        isDense: true,
                        underline: const SizedBox.shrink(),
                        dropdownColor: context.paper2,
                        iconSize: 16,
                        style: MbTheme.sans(size: 13, color: context.ink),
                        items: (targets.isEmpty ? ['questions', 'interests'] : targets)
                            .map((id) {
                          final p = findPanel(id);
                          return DropdownMenuItem(
                            value: id,
                            child: Text(p == null ? id : T.t(p.labelKey)),
                          );
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) onTarget(v);
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

class _StepReady extends StatelessWidget {
  const _StepReady({required this.selected});
  final List<String> selected;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 4),
            Text.rich(
              TextSpan(
                style: MbTheme.serif(size: 44, color: context.ink, height: 1.0),
                children: [
                  const TextSpan(text: 'Your board\nis '),
                  TextSpan(
                    text: 'ready.',
                    style: MbTheme.serif(
                      size: 44, color: MbColors.sage,
                      style: FontStyle.italic, height: 1.0,
                    ),
                  ),
                ],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 14),
            Text(
              T.t('ob_ready_lede'),
              textAlign: TextAlign.center,
              style: MbTheme.serif(
                size: 16, color: context.ink2, style: FontStyle.italic, height: 1.4,
              ),
            ),
            const SizedBox(height: 28),
            ...selected.map((id) {
              final p = findPanel(id);
              if (p == null) return const SizedBox.shrink();
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                width: double.infinity,
                decoration: BoxDecoration(
                  color: context.paper2,
                  border: Border.all(color: context.line),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 26, height: 26,
                      decoration: BoxDecoration(
                        color: context.sageBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: Text(p.icon,
                          style: MbTheme.serif(
                            size: 13, color: MbColors.sage, height: 1,
                          )),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(T.t(p.labelKey),
                          style: MbTheme.sans(size: 14, color: context.ink, weight: FontWeight.w500)),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
