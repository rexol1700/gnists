import 'package:flutter/material.dart';

import '../api/client.dart';
import '../i18n/strings.dart';
import '../state/app_state.dart';
import '../theme/mb_theme.dart';

/// Small "🤖" affordance for AI actions. Surfaces server-side errors:
/// 503 → "AI not configured", 429 'ai_budget_exceeded' → demo-limit toast.
class AiButton extends StatefulWidget {
  const AiButton({
    required this.app,
    required this.kind, // 'define' | 'answer' | 'ingredients' | 'instructions'
    required this.text,
    required this.onResult,
    this.tooltip,
    this.size = 22,
  });

  final AppState app;
  final String kind;
  final String text;
  final ValueChanged<String> onResult;
  final String? tooltip;
  final double size;

  @override
  State<AiButton> createState() => _AiButtonState();
}

class _AiButtonState extends State<AiButton> with SingleTickerProviderStateMixin {
  bool _busy = false;
  late final AnimationController _spin = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat();

  @override
  void dispose() {
    _spin.dispose();
    super.dispose();
  }

  Future<void> _run() async {
    if (_busy) return;
    final input = widget.text.trim();
    if (input.isEmpty) return;
    setState(() => _busy = true);
    try {
      final result = await widget.app.api
          .ai(widget.kind, input, lang: widget.app.lang.code);
      if (!mounted) return;
      widget.onResult(result);
    } on ApiException catch (e) {
      if (!mounted) return;
      String msg;
      if (e.code == 'ai_budget_exceeded') {
        final resetAtMs = (e.payload?['resetAt'] as int?) ?? 0;
        final days = resetAtMs > 0
            ? ((resetAtMs - DateTime.now().millisecondsSinceEpoch) / (1000 * 60 * 60 * 24))
                .ceil()
            : 0;
        msg = '${T.t('ai_demo_exhausted')} — ${T.t('ai_demo_resets')} ${days}${T.t('ai_demo_days')}';
      } else if (e.status == 503) {
        msg = T.t('ai_unavailable');
      } else {
        msg = e.message;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(T.t('err_network'))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _busy ? context.sage : context.muted;
    return Tooltip(
      message: widget.tooltip ?? T.t('ai_${widget.kind}'),
      child: GestureDetector(
        onTap: _busy ? null : _run,
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: _busy
              ? RotationTransition(
                  turns: _spin,
                  child: Icon(Icons.auto_awesome, size: widget.size, color: color),
                )
              : Icon(Icons.auto_awesome_outlined, size: widget.size, color: color),
        ),
      ),
    );
  }
}
