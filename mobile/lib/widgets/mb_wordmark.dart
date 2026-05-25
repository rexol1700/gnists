import 'package:flutter/material.dart';

import '../theme/mb_theme.dart';

/// The MyBoard wordmark — italic serif logo with sage accent.
class MbWordmark extends StatelessWidget {
  const MbWordmark({this.size = 22, this.showMark = true});
  final double size;
  final bool showMark;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        if (showMark) ...[
          _Mark(size: size * 0.9),
          SizedBox(width: size * 0.32),
        ],
        Text.rich(
          TextSpan(
            style: MbTheme.serif(size: size, color: context.ink, height: 1, letterSpacing: -0.01),
            children: [
              const TextSpan(text: 'My'),
              TextSpan(
                text: 'Board',
                style: MbTheme.serif(
                  size: size,
                  color: MbColors.sage,
                  height: 1,
                  letterSpacing: -0.01,
                  style: FontStyle.italic,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// The small "board" mark: tall left column + two right tiles (top dark, bottom sage).
class _Mark extends StatelessWidget {
  const _Mark({required this.size});
  final double size;

  @override
  Widget build(BuildContext context) {
    final ink = context.ink;
    return SizedBox(
      width: size,
      height: size,
      child: LayoutBuilder(builder: (context, c) {
        final w = c.maxWidth;
        final h = c.maxHeight;
        // grid: 1.4fr | 1fr   rows 1 / 1
        final leftW = w * (1.4 / 2.4) - 1;
        final rightW = w - leftW - 2;
        final rowH = (h - 2) / 2;
        return Stack(
          children: [
            Positioned(
              left: 0, top: 0,
              width: leftW, height: h,
              child: _Tile(color: ink),
            ),
            Positioned(
              right: 0, top: 0,
              width: rightW, height: rowH,
              child: _Tile(color: ink),
            ),
            Positioned(
              right: 0, bottom: 0,
              width: rightW, height: rowH,
              child: const _Tile(color: MbColors.sage),
            ),
          ],
        );
      }),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.color});
  final Color color;
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }
}
