import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// MyBoard design tokens — mirrors public/style.css :root variables.
/// Light direction: warm paper, cool ink, soft sage + coral accents.
class MbColors {
  // Light surfaces
  static const bone = Color(0xFFF4EFE6);
  static const paper = Color(0xFFFBF8F1);
  static const paper2 = Color(0xFFFFFFFF);

  // Light ink
  static const ink = Color(0xFF1C1B18);
  static const ink2 = Color(0xFF2B2925);
  static const muted = Color(0xFF837F76);

  // Light lines
  static const line = Color(0xFFE5DFD2);
  static const line2 = Color(0xFFD8D2C2);

  // Accents (approximated from oklch in CSS)
  static const sage = Color(0xFF6F9D7C);
  static const sageBg = Color(0xFFE5F0E7);
  static const coral = Color(0xFFC97B6A);
  static const coralBg = Color(0xFFF6E2DC);

  // Dark surfaces
  static const darkBone = Color(0xFF1C1B18);
  static const darkPaper = Color(0xFF232220);
  static const darkPaper2 = Color(0xFF2B2925);
  static const darkInk = Color(0xFFF4EFE6);
  static const darkInk2 = Color(0xFFE5DFD2);
  static const darkLine = Color(0xFF3A3733);
  static const darkLine2 = Color(0xFF4A4642);
  static const darkSageBg = Color(0xFF2C4233);
  static const darkCoralBg = Color(0xFF453029);
}

class MbTheme {
  static const radius = 14.0;

  static ThemeData light() => _build(brightness: Brightness.light);
  static ThemeData dark() => _build(brightness: Brightness.dark);

  static ThemeData _build({required Brightness brightness}) {
    final isLight = brightness == Brightness.light;
    final bg = isLight ? MbColors.bone : MbColors.darkBone;
    final surface = isLight ? MbColors.paper : MbColors.darkPaper;
    final ink = isLight ? MbColors.ink : MbColors.darkInk;
    final muted = MbColors.muted;
    final line = isLight ? MbColors.line : MbColors.darkLine;

    // Geist isn't registered in google_fonts yet — Inter is its closest sibling
    // (Geist is a fork of Inter), so it preserves the same geometric, neutral feel.
    final geist = GoogleFonts.interTextTheme(
      ThemeData(brightness: brightness).textTheme,
    );

    return ThemeData(
      brightness: brightness,
      useMaterial3: true,
      scaffoldBackgroundColor: bg,
      canvasColor: surface,
      colorScheme: (isLight
              ? ColorScheme.light(
                  primary: MbColors.ink,
                  secondary: MbColors.sage,
                  surface: surface,
                  error: MbColors.coral,
                )
              : ColorScheme.dark(
                  primary: MbColors.darkInk,
                  secondary: MbColors.sage,
                  surface: surface,
                  error: MbColors.coral,
                ))
          .copyWith(outline: line),
      textTheme: geist.apply(bodyColor: ink, displayColor: ink),
      iconTheme: IconThemeData(color: ink),
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isLight ? MbColors.paper2 : MbColors.darkPaper2,
        hintStyle: TextStyle(color: muted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isLight ? MbColors.line2 : MbColors.darkLine2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isLight ? MbColors.line2 : MbColors.darkLine2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: MbColors.sage, width: 2),
        ),
      ),
      dividerTheme: DividerThemeData(color: line, thickness: 1, space: 1),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: ink,
        contentTextStyle: TextStyle(color: surface, fontFamily: GoogleFonts.inter().fontFamily),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  /// Instrument Serif — headlines + italicized accents.
  static TextStyle serif({
    double size = 22,
    FontWeight weight = FontWeight.w400,
    FontStyle? style,
    Color? color,
    double height = 1.1,
    double letterSpacing = -0.01,
  }) =>
      GoogleFonts.instrumentSerif(
        fontSize: size,
        fontWeight: weight,
        fontStyle: style ?? FontStyle.normal,
        color: color,
        height: height,
        letterSpacing: letterSpacing,
      );

  /// Inter — body & UI (closest open-source sibling to Geist).
  static TextStyle sans({
    double size = 14,
    FontWeight weight = FontWeight.w400,
    Color? color,
    double height = 1.5,
    double letterSpacing = -0.005,
  }) =>
      GoogleFonts.inter(
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: height,
        letterSpacing: letterSpacing,
      );

  /// JetBrains Mono — labels & numerals (Geist Mono substitute).
  static TextStyle mono({
    double size = 11,
    FontWeight weight = FontWeight.w400,
    Color? color,
    double letterSpacing = 0.12,
  }) =>
      GoogleFonts.jetBrainsMono(
        fontSize: size,
        fontWeight: weight,
        color: color,
        letterSpacing: letterSpacing,
      );
}

/// Helpers to read brightness-aware tokens from a BuildContext.
extension MbContext on BuildContext {
  bool get isDark => Theme.of(this).brightness == Brightness.dark;
  Color get bone => isDark ? MbColors.darkBone : MbColors.bone;
  Color get paper => isDark ? MbColors.darkPaper : MbColors.paper;
  Color get paper2 => isDark ? MbColors.darkPaper2 : MbColors.paper2;
  Color get ink => isDark ? MbColors.darkInk : MbColors.ink;
  Color get ink2 => isDark ? MbColors.darkInk2 : MbColors.ink2;
  Color get muted => MbColors.muted;
  Color get line => isDark ? MbColors.darkLine : MbColors.line;
  Color get line2 => isDark ? MbColors.darkLine2 : MbColors.line2;
  Color get sage => MbColors.sage;
  Color get sageBg => isDark ? MbColors.darkSageBg : MbColors.sageBg;
  Color get coral => MbColors.coral;
  Color get coralBg => isDark ? MbColors.darkCoralBg : MbColors.coralBg;
}
