import 'package:flutter/material.dart';

import '../theme/mb_theme.dart';

/// Inline tiny add-input used inside panels.
class MbInlineInput extends StatefulWidget {
  const MbInlineInput({
    required this.hint,
    required this.onSubmit,
    this.controller,
    this.autofocus = false,
    this.trailing,
  });

  final String hint;
  final ValueChanged<String> onSubmit;
  final TextEditingController? controller;
  final bool autofocus;
  final Widget? trailing;

  @override
  State<MbInlineInput> createState() => _MbInlineInputState();
}

class _MbInlineInputState extends State<MbInlineInput> {
  late final TextEditingController _ctrl =
      widget.controller ?? TextEditingController();

  @override
  void dispose() {
    if (widget.controller == null) _ctrl.dispose();
    super.dispose();
  }

  void _submit() {
    final v = _ctrl.text.trim();
    if (v.isEmpty) return;
    widget.onSubmit(v);
    _ctrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.bone,
        borderRadius: BorderRadius.circular(10),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _ctrl,
              autofocus: widget.autofocus,
              onSubmitted: (_) => _submit(),
              textInputAction: TextInputAction.done,
              style: MbTheme.sans(size: 14, color: context.ink),
              decoration: InputDecoration(
                hintText: widget.hint,
                hintStyle: MbTheme.sans(size: 14, color: context.muted),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                isCollapsed: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                filled: false,
              ),
            ),
          ),
          if (widget.trailing != null) widget.trailing!,
          IconButton(
            onPressed: _submit,
            iconSize: 18,
            color: context.muted,
            icon: const Icon(Icons.arrow_forward_rounded),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ],
      ),
    );
  }
}
