import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'screens/home_screen.dart';
import 'screens/landing_screen.dart';
import 'state/app_state.dart';
import 'theme/mb_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyBoardApp());
}

class MyBoardApp extends StatefulWidget {
  const MyBoardApp();
  @override
  State<MyBoardApp> createState() => _MyBoardAppState();
}

class _MyBoardAppState extends State<MyBoardApp> {
  final AppState _app = AppState();

  @override
  void initState() {
    super.initState();
    _app.boot();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _app,
      builder: (context, _) {
        final brightness = _app.darkMode ? Brightness.dark : Brightness.light;
        SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness:
              _app.darkMode ? Brightness.light : Brightness.dark,
          statusBarBrightness:
              _app.darkMode ? Brightness.dark : Brightness.light,
        ));
        return MaterialApp(
          title: 'MyBoard',
          debugShowCheckedModeBanner: false,
          theme: MbTheme.light(),
          darkTheme: MbTheme.dark(),
          themeMode: _app.darkMode ? ThemeMode.dark : ThemeMode.light,
          home: !_app.booted
              ? _BootSplash(brightness: brightness)
              : (_app.isAuthed ? HomeScreen(app: _app) : LandingScreen(app: _app)),
        );
      },
    );
  }
}

class _BootSplash extends StatelessWidget {
  const _BootSplash({required this.brightness});
  final Brightness brightness;
  @override
  Widget build(BuildContext context) {
    final isLight = brightness == Brightness.light;
    return Scaffold(
      backgroundColor: isLight ? MbColors.paper : MbColors.darkPaper,
      body: const Center(
        child: SizedBox(
          width: 26, height: 26,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation(MbColors.sage),
          ),
        ),
      ),
    );
  }
}
