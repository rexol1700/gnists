import 'package:flutter/material.dart';

import '../api/client.dart';
import '../i18n/strings.dart';
import '../state/app_state.dart';
import '../theme/mb_theme.dart';
import '../widgets/mb_button.dart';
import '../widgets/mb_wordmark.dart';
import 'home_screen.dart';
import 'onboarding_screen.dart';

enum AuthMode { login, register }

class AuthScreen extends StatefulWidget {
  const AuthScreen({required this.app, this.initialMode = AuthMode.login});
  final AppState app;
  final AuthMode initialMode;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  late AuthMode _mode = widget.initialMode;
  final _u = TextEditingController();
  final _p = TextEditingController();
  bool _busy = false;
  String? _error;
  bool _hidePw = true;

  @override
  void dispose() {
    _u.dispose();
    _p.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final u = _u.text.trim();
    final p = _p.text;
    if (u.isEmpty || p.isEmpty) {
      setState(() => _error = T.t('err_generic'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = _mode == AuthMode.register
          ? await widget.app.register(u, p)
          : await widget.app.login(u, p);
      if (!mounted) return;
      if (res.isNew) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => OnboardingScreen(app: widget.app)),
          (_) => false,
        );
      } else {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => HomeScreen(app: widget.app)),
          (_) => false,
        );
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = T.t('err_network'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isReg = _mode == AuthMode.register;
    return Scaffold(
      backgroundColor: context.paper2,
      appBar: AppBar(
        backgroundColor: context.paper2,
        elevation: 0,
        title: const MbWordmark(size: 18),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(28, 12, 28, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              T.t('app_name').toUpperCase(),
              style: MbTheme.mono(size: 11, color: context.muted, letterSpacing: 0.18),
            ),
            const SizedBox(height: 14),
            Text.rich(
              TextSpan(
                style: MbTheme.serif(size: 44, color: context.ink, height: 1.0),
                children: [
                  TextSpan(text: isReg ? 'Welcome to\n' : 'Sign in to\n'),
                  TextSpan(
                    text: isReg ? 'your board.' : 'your board.',
                    style: MbTheme.serif(
                      size: 44, color: MbColors.sage,
                      style: FontStyle.italic, height: 1.0,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              T.t('app_tag'),
              style: MbTheme.serif(
                size: 16, color: context.ink2, style: FontStyle.italic, height: 1.4,
              ),
            ),
            const SizedBox(height: 32),
            _Label(text: T.t('username').toUpperCase()),
            const SizedBox(height: 6),
            TextField(
              controller: _u,
              autocorrect: false,
              textCapitalization: TextCapitalization.none,
              decoration: InputDecoration(
                hintText: T.t('username'),
              ),
              style: MbTheme.sans(size: 15, color: context.ink),
            ),
            const SizedBox(height: 14),
            _Label(text: T.t('password').toUpperCase()),
            const SizedBox(height: 6),
            TextField(
              controller: _p,
              obscureText: _hidePw,
              decoration: InputDecoration(
                hintText: T.t('password'),
                suffixIcon: IconButton(
                  icon: Icon(_hidePw ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      color: context.muted, size: 20),
                  onPressed: () => setState(() => _hidePw = !_hidePw),
                ),
              ),
              onSubmitted: (_) => _submit(),
              style: MbTheme.sans(size: 15, color: context.ink),
            ),
            const SizedBox(height: 14),
            if (_error != null)
              Text(_error!, style: MbTheme.sans(size: 13, color: context.coral)),
            const SizedBox(height: 14),
            MbButton(
              label: isReg ? T.t('sign_up') : T.t('sign_in'),
              busy: _busy,
              onTap: _submit,
              fullWidth: true,
              trailing: const Icon(Icons.arrow_forward_rounded, size: 16),
            ),
            const SizedBox(height: 18),
            Center(
              child: GestureDetector(
                onTap: () => setState(() {
                  _mode = isReg ? AuthMode.login : AuthMode.register;
                  _error = null;
                }),
                child: Text.rich(
                  TextSpan(
                    style: MbTheme.sans(size: 13, color: context.muted),
                    children: [
                      TextSpan(text: isReg ? T.t('have_account') + '  ' : T.t('need_account') + '  '),
                      TextSpan(
                        text: isReg ? T.t('sign_in') : T.t('sign_up'),
                        style: MbTheme.sans(
                          size: 13, color: context.ink, weight: FontWeight.w500,
                        ).copyWith(decoration: TextDecoration.underline),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) {
    return Text(text,
        style: MbTheme.mono(size: 10, color: context.muted, letterSpacing: 0.18));
  }
}
