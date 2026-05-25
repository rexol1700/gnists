import 'package:flutter/material.dart';

import '../i18n/strings.dart';
import '../panels/panel_registry.dart';
import '../theme/mb_theme.dart';

/// Card surrounding every panel on the home board.
/// Renders: header (icon + title + count + reset), body (caller-provided).
class PanelShell extends StatelessWidget {
  const PanelShell({
    required this.panel,
    required this.count,
    required this.onReset,
    required this.onRemove,
    required this.child,
  });

  final PanelDef panel;
  final int count;
  final VoidCallback onReset;
  final VoidCallback onRemove;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: context.paper2,
        border: Border.all(color: context.line),
        borderRadius: BorderRadius.circular(18),
      ),
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _IconBadge(glyph: panel.icon),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  T.t(panel.labelKey),
                  style: MbTheme.sans(
                    size: 14, weight: FontWeight.w600, color: context.ink, height: 1.2,
                    letterSpacing: -0.005,
                  ),
                ),
              ),
              Text(
                '$count',
                style: MbTheme.mono(size: 11, color: context.muted, letterSpacing: 0.06),
              ),
              PopupMenuButton<String>(
                tooltip: '',
                icon: Icon(Icons.more_horiz, size: 18, color: context.muted),
                color: context.paper2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: context.line),
                ),
                onSelected: (v) {
                  if (v == 'reset') onReset();
                  if (v == 'remove') onRemove();
                },
                itemBuilder: (_) => [
                  PopupMenuItem(
                    value: 'reset',
                    child: Text(T.t('reset_list'),
                        style: MbTheme.sans(size: 13, color: context.ink)),
                  ),
                  PopupMenuItem(
                    value: 'remove',
                    child: Text(T.t('delete'),
                        style: MbTheme.sans(size: 13, color: context.coral)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _IconBadge extends StatelessWidget {
  const _IconBadge({required this.glyph});
  final String glyph;
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28, height: 28,
      decoration: BoxDecoration(
        color: context.bone,
        borderRadius: BorderRadius.circular(8),
      ),
      alignment: Alignment.center,
      child: Text(
        glyph,
        style: MbTheme.serif(size: 15, color: context.ink, height: 1),
      ),
    );
  }
}

class EmptyHint extends StatelessWidget {
  const EmptyHint({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: MbTheme.serif(
          size: 14, color: context.muted, height: 1.4, style: FontStyle.italic,
        ),
      ),
    );
  }
}
