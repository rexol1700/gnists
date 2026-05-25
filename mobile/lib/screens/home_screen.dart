import 'package:flutter/material.dart';

import '../i18n/strings.dart';
import '../panels/panel_registry.dart';
import '../state/app_state.dart';
import '../theme/mb_theme.dart';
import '../widgets/mb_button.dart';
import '../widgets/mb_wordmark.dart';
import 'panel_renderer.dart';
import 'landing_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({required this.app});
  final AppState app;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => widget.app.reloadBoard());
  }

  Future<void> _refresh() async {
    await widget.app.reloadBoard();
  }

  void _openAddPanel() async {
    final missing = kPanelRegistry
        .where((p) => !widget.app.activePanels.contains(p.id))
        .toList();
    if (missing.isEmpty) return;
    await showModalBottomSheet(
      context: context,
      backgroundColor: context.paper2,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        minChildSize: 0.3,
        maxChildSize: 0.92,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 22),
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: context.line2,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(T.t('add_panel'),
                style: MbTheme.serif(size: 28, color: context.ink, height: 1.0)),
            const SizedBox(height: 6),
            Text(T.t('add_panel_hint'),
                style: MbTheme.serif(
                  size: 15, color: context.ink2, style: FontStyle.italic, height: 1.4,
                )),
            const SizedBox(height: 16),
            ...missing.map((p) => _AddOptionTile(
                  panel: p,
                  onTap: () async {
                    await widget.app.togglePanel(p.id, on: true);
                    if (!mounted) return;
                    Navigator.of(sheetCtx).pop();
                  },
                )),
          ],
        ),
      ),
    );
  }

  void _openSettings() {
    showModalBottomSheet(
      context: context,
      backgroundColor: context.paper2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: context.line2,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: context.sageBg,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      (widget.app.username ?? '?').substring(0, 1).toUpperCase(),
                      style: MbTheme.sans(
                        size: 13, color: MbColors.sage, weight: FontWeight.w600, height: 1,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.app.username ?? '',
                      style: MbTheme.sans(
                        size: 15, color: context.ink, weight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _SettingRow(
                label: T.t('language'),
                child: AnimatedBuilder(
                  animation: widget.app,
                  builder: (_, __) => _LangChips(app: widget.app),
                ),
              ),
              _SettingRow(
                label: T.t('theme'),
                child: AnimatedBuilder(
                  animation: widget.app,
                  builder: (_, __) => _ThemeChips(app: widget.app),
                ),
              ),
              const SizedBox(height: 14),
              MbButton(
                label: T.t('sign_out'),
                ghost: true,
                fullWidth: true,
                onTap: () async {
                  Navigator.of(sheetCtx).pop();
                  await widget.app.logout();
                  if (!mounted) return;
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => LandingScreen(app: widget.app)),
                    (_) => false,
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bone,
      body: SafeArea(
        child: AnimatedBuilder(
          animation: widget.app,
          builder: (context, _) {
            final body = widget.app.boardLoading && widget.app.board.lists.isEmpty
                ? _LoadingState()
                : (widget.app.boardError != null
                    ? _ErrorState(
                        error: widget.app.boardError!,
                        billingRequired: widget.app.boardError!.toLowerCase().contains('subscription'),
                        onRetry: _refresh,
                      )
                    : _BoardList(app: widget.app, onAdd: _openAddPanel));
            return Column(
              children: [
                _TopBar(
                  username: widget.app.username,
                  onSettings: _openSettings,
                  onAdd: _openAddPanel,
                ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _refresh,
                    color: MbColors.sage,
                    backgroundColor: context.paper2,
                    child: body,
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.username, required this.onSettings, required this.onAdd});
  final String? username;
  final VoidCallback onSettings;
  final VoidCallback onAdd;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 12, 12),
      decoration: BoxDecoration(
        color: context.paper,
        border: Border(bottom: BorderSide(color: context.line)),
      ),
      child: Row(
        children: [
          const MbWordmark(size: 20),
          const Spacer(),
          GestureDetector(
            onTap: onAdd,
            child: Container(
              height: 34,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: context.ink,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                children: [
                  Icon(Icons.add_rounded, size: 16, color: context.paper),
                  const SizedBox(width: 4),
                  Text(T.t('add_panel'),
                      style: MbTheme.sans(
                        size: 13, weight: FontWeight.w500, color: context.paper, height: 1,
                      )),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: onSettings,
            child: Container(
              width: 34, height: 34,
              decoration: BoxDecoration(
                color: context.paper2,
                border: Border.all(color: context.line),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                (username ?? '?').substring(0, 1).toUpperCase(),
                style: MbTheme.sans(
                  size: 12, weight: FontWeight.w600, color: context.ink2, height: 1,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BoardList extends StatelessWidget {
  const _BoardList({required this.app, required this.onAdd});
  final AppState app;
  final VoidCallback onAdd;
  @override
  Widget build(BuildContext context) {
    final active = app.activePanels;
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 32),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 14, left: 2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(
                  style: MbTheme.serif(size: 30, color: context.ink, height: 1.0),
                  children: [
                    const TextSpan(text: 'Your '),
                    TextSpan(
                      text: 'board.',
                      style: MbTheme.serif(
                        size: 30, color: MbColors.sage,
                        style: FontStyle.italic, height: 1.0,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Text(
                T.t('home_lede').toUpperCase(),
                style: MbTheme.mono(size: 10, color: context.muted, letterSpacing: 0.18),
              ),
            ],
          ),
        ),
        ...active.map((id) {
          final p = findPanel(id);
          if (p == null) return const SizedBox.shrink();
          return PanelRenderer(
            key: ValueKey(p.id),
            app: app,
            panel: p,
          );
        }),
        const SizedBox(height: 12),
        InkWell(
          onTap: onAdd,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            decoration: BoxDecoration(
              color: context.paper,
              border: Border.all(color: context.line2, style: BorderStyle.solid, width: 1.5),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              children: [
                Container(
                  width: 32, height: 32,
                  decoration: BoxDecoration(
                    color: context.paper2,
                    border: Border.all(color: context.line2),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Icon(Icons.add_rounded, size: 16, color: context.ink2),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(T.t('add_panel'),
                          style: MbTheme.sans(
                            size: 14, weight: FontWeight.w500, color: context.ink,
                          )),
                      const SizedBox(height: 2),
                      Text('PICK A NEW BOARD',
                          style: MbTheme.mono(size: 10, color: context.muted, letterSpacing: 0.12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _LoadingState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 32, height: 32,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation(context.ink),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error, required this.onRetry, this.billingRequired = false});
  final String error;
  final VoidCallback onRetry;
  final bool billingRequired;
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(28),
      children: [
        const SizedBox(height: 60),
        Icon(Icons.cloud_off_rounded, size: 36, color: context.muted),
        const SizedBox(height: 18),
        Text(
          billingRequired ? T.t('err_subscription_required') : T.t('err_generic'),
          textAlign: TextAlign.center,
          style: MbTheme.serif(
            size: 22, color: context.ink, height: 1.2, style: FontStyle.italic,
          ),
        ),
        const SizedBox(height: 8),
        Text(error,
            textAlign: TextAlign.center,
            style: MbTheme.sans(size: 13, color: context.muted)),
        const SizedBox(height: 18),
        Center(
          child: MbButton(label: T.t('continue'), onTap: onRetry),
        ),
      ],
    );
  }
}

class _AddOptionTile extends StatelessWidget {
  const _AddOptionTile({required this.panel, required this.onTap});
  final PanelDef panel;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                color: context.bone,
                borderRadius: BorderRadius.circular(8),
              ),
              alignment: Alignment.center,
              child: Text(panel.icon,
                  style: MbTheme.serif(size: 15, color: context.ink, height: 1)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(T.t(panel.labelKey),
                      style: MbTheme.sans(
                        size: 14, color: context.ink, weight: FontWeight.w500,
                      )),
                  const SizedBox(height: 2),
                  Text(T.t(panel.descKey),
                      style: MbTheme.sans(size: 12, color: context.muted)),
                ],
              ),
            ),
            Icon(Icons.add_circle_outline_rounded, size: 18, color: context.muted),
          ],
        ),
      ),
    );
  }
}

class _SettingRow extends StatelessWidget {
  const _SettingRow({required this.label, required this.child});
  final String label;
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: MbTheme.sans(size: 13, color: context.ink2)),
          ),
          child,
        ],
      ),
    );
  }
}

class _LangChips extends StatelessWidget {
  const _LangChips({required this.app});
  final AppState app;
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        MbPill(label: 'EN', active: app.lang == Lang.en, onTap: () => app.setLang(Lang.en)),
        const SizedBox(width: 6),
        MbPill(label: 'NO', active: app.lang == Lang.no, onTap: () => app.setLang(Lang.no)),
      ],
    );
  }
}

class _ThemeChips extends StatelessWidget {
  const _ThemeChips({required this.app});
  final AppState app;
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        MbPill(label: 'Light', icon: Icons.light_mode_outlined, active: !app.darkMode, onTap: () { if (app.darkMode) app.toggleDark(); }),
        const SizedBox(width: 6),
        MbPill(label: 'Dark', icon: Icons.dark_mode_outlined, active: app.darkMode, onTap: () { if (!app.darkMode) app.toggleDark(); }),
      ],
    );
  }
}
