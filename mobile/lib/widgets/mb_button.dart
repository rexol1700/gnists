import 'package:flutter/material.dart';

import '../theme/mb_theme.dart';

/// Dark-ink primary button, matching .btn from the web design system.
class MbButton extends StatelessWidget {
  const MbButton({
    required this.label,
    required this.onTap,
    this.trailing,
    this.busy = false,
    this.fullWidth = false,
    this.ghost = false,
  });

  final String label;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool busy;
  final bool fullWidth;
  final bool ghost;

  @override
  Widget build(BuildContext context) {
    final disabled = onTap == null || busy;
    final bgInk = context.ink;
    final fgPaper = context.paper;
    final child = AnimatedOpacity(
      duration: const Duration(milliseconds: 150),
      opacity: disabled ? 0.6 : 1,
      child: Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 22),
        decoration: BoxDecoration(
          color: ghost ? Colors.transparent : bgInk,
          border: Border.all(
            color: ghost ? context.line2 : Colors.transparent,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
          children: [
            if (busy) ...[
              SizedBox(
                width: 16, height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(ghost ? context.ink : fgPaper),
                ),
              ),
              const SizedBox(width: 10),
            ],
            Text(
              label,
              style: MbTheme.sans(
                size: 14,
                weight: FontWeight.w500,
                color: ghost ? context.ink : fgPaper,
                height: 1,
              ),
            ),
            if (trailing != null) ...[
              const SizedBox(width: 10),
              IconTheme(
                data: IconThemeData(
                  color: ghost ? context.ink : fgPaper, size: 16,
                ),
                child: trailing!,
              ),
            ],
          ],
        ),
      ),
    );

    final wrapped = GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: disabled ? null : onTap,
      child: child,
    );
    return fullWidth ? SizedBox(width: double.infinity, child: wrapped) : wrapped;
  }
}

/// Compact pill-style button used in toolbars.
class MbPill extends StatelessWidget {
  const MbPill({required this.label, this.icon, this.onTap, this.active = false});
  final String label;
  final IconData? icon;
  final VoidCallback? onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final bg = active ? context.ink : context.paper2;
    final fg = active ? context.paper : context.ink2;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 34,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: bg,
          border: Border.all(color: active ? context.ink : context.line),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 14, color: fg),
              const SizedBox(width: 6),
            ],
            Text(label,
                style: MbTheme.sans(
                  size: 13, color: fg, weight: FontWeight.w500, height: 1,
                )),
          ],
        ),
      ),
    );
  }
}
