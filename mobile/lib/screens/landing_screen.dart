import 'package:flutter/material.dart';

import '../i18n/strings.dart';
import '../state/app_state.dart';
import '../theme/mb_theme.dart';
import '../widgets/mb_button.dart';
import '../widgets/mb_wordmark.dart';
import 'auth_screen.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({required this.app});
  final AppState app;

  void _go(BuildContext context, {required bool register}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AuthScreen(app: app, initialMode: register ? AuthMode.register : AuthMode.login),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.paper,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const MbWordmark(size: 22),
                  AnimatedBuilder(
                    animation: app,
                    builder: (_, __) => _LangToggle(app: app),
                  ),
                ],
              ),
              const Spacer(),
              // Big hero
              Stack(
                clipBehavior: Clip.none,
                children: [
                  // sage halo
                  Positioned(
                    right: -120, top: 40,
                    child: Container(
                      width: 320, height: 320,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [context.sageBg, context.sageBg.withOpacity(0)],
                          stops: const [0, 0.75],
                        ),
                      ),
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text.rich(
                        TextSpan(
                          style: MbTheme.serif(size: 64, color: context.ink, height: 0.98),
                          children: [
                            const TextSpan(text: 'A quiet\nplace for\n'),
                            TextSpan(
                              text: 'everything',
                              style: MbTheme.serif(
                                size: 64, color: MbColors.sage, style: FontStyle.italic, height: 0.98,
                              ),
                            ),
                            const TextSpan(text: '\non your mind.'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),
                      Text(
                        T.t('app_blurb'),
                        style: MbTheme.serif(
                          size: 17, color: context.ink2, style: FontStyle.italic, height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const Spacer(),
              Row(
                children: [
                  Expanded(
                    child: MbButton(
                      label: T.t('sign_up'),
                      onTap: () => _go(context, register: true),
                      trailing: const Icon(Icons.arrow_forward_rounded, size: 16),
                      fullWidth: true,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: MbButton(
                      label: T.t('sign_in'),
                      ghost: true,
                      onTap: () => _go(context, register: false),
                      fullWidth: true,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                'MYBOARD · ${T.t('app_tag').toUpperCase()}',
                style: MbTheme.mono(size: 10, color: context.muted, letterSpacing: 0.18),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LangToggle extends StatelessWidget {
  const _LangToggle({required this.app});
  final AppState app;
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.paper2,
        border: Border.all(color: context.line),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _btn(context, Lang.en),
          _btn(context, Lang.no),
        ],
      ),
    );
  }

  Widget _btn(BuildContext c, Lang l) {
    final on = app.lang == l;
    return GestureDetector(
      onTap: () => app.setLang(l),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: on ? c.ink : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          l.label,
          style: MbTheme.sans(
            size: 12, weight: FontWeight.w500,
            color: on ? c.paper : c.muted, height: 1,
          ),
        ),
      ),
    );
  }
}
