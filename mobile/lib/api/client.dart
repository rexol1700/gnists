import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/board_models.dart';

/// Throws ApiException for non-2xx responses. Carries a status code + parsed
/// error code (e.g. 'ai_budget_exceeded', 'subscription_required') for the UI.
class ApiException implements Exception {
  ApiException(this.status, this.message, {this.code, this.payload});
  final int status;
  final String message;
  final String? code;
  final Map<String, dynamic>? payload;
  @override
  String toString() => 'ApiException($status): $message';
}

class MyBoardClient {
  MyBoardClient._();
  static final MyBoardClient instance = MyBoardClient._();

  /// Override at build time:
  ///   flutter run --dart-define=API_BASE=https://your.backend
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://myboard.org',
  );

  String? _token;
  String? _username;

  String get baseUrl => _baseUrl;
  String? get token => _token;
  String? get username => _username;
  bool get isAuthed => _token != null;

  Future<void> loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('mb_token');
    _username = prefs.getString('mb_username');
  }

  Future<void> _saveToStorage() async {
    final prefs = await SharedPreferences.getInstance();
    if (_token != null) {
      await prefs.setString('mb_token', _token!);
    } else {
      await prefs.remove('mb_token');
    }
    if (_username != null) {
      await prefs.setString('mb_username', _username!);
    } else {
      await prefs.remove('mb_username');
    }
  }

  Future<void> logout() async {
    _token = null;
    _username = null;
    await _saveToStorage();
  }

  Map<String, String> _headers({bool json = true}) {
    return {
      if (json) 'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
  }

  Uri _u(String path) => Uri.parse('$_baseUrl$path');

  Future<dynamic> _decode(http.Response r) async {
    Map<String, dynamic>? body;
    try {
      body = jsonDecode(r.body) as Map<String, dynamic>;
    } catch (_) {
      body = null;
    }
    if (r.statusCode >= 200 && r.statusCode < 300) return body ?? {};
    final msg = body?['error']?.toString() ?? 'HTTP ${r.statusCode}';
    final code = body?['code']?.toString();
    throw ApiException(r.statusCode, msg, code: code, payload: body);
  }

  // ── AUTH ────────────────────────────────────────────────────────────────
  Future<AuthResult> register(String username, String password) async {
    final r = await http
        .post(_u('/api/register'),
            headers: _headers(),
            body: jsonEncode({'username': username, 'password': password}))
        .timeout(const Duration(seconds: 20));
    final d = await _decode(r) as Map<String, dynamic>;
    _token = d['token'] as String?;
    _username = d['username'] as String?;
    await _saveToStorage();
    return AuthResult(
      token: _token!,
      username: _username!,
      isNew: (d['isNew'] as bool?) ?? true,
    );
  }

  Future<AuthResult> login(String username, String password) async {
    final r = await http
        .post(_u('/api/login'),
            headers: _headers(),
            body: jsonEncode({'username': username, 'password': password}))
        .timeout(const Duration(seconds: 20));
    final d = await _decode(r) as Map<String, dynamic>;
    _token = d['token'] as String?;
    _username = d['username'] as String?;
    await _saveToStorage();
    return AuthResult(
      token: _token!,
      username: _username!,
      isNew: (d['isNew'] as bool?) ?? false,
    );
  }

  // ── BILLING / ACCESS ────────────────────────────────────────────────────
  Future<BillingStatus> billingStatus() async {
    final r = await http.get(_u('/api/billing/status'), headers: _headers(json: false));
    final d = await _decode(r) as Map<String, dynamic>;
    return BillingStatus.fromJson(d);
  }

  // ── BOARD DATA ──────────────────────────────────────────────────────────
  Future<BoardData> getBoard() async {
    final r = await http.get(_u('/api/data'), headers: _headers(json: false));
    final d = await _decode(r) as Map<String, dynamic>;
    return BoardData.fromJson(d);
  }

  Future<int> addItem(String listName, String content, {String extra = ''}) async {
    final r = await http.post(_u('/api/data/$listName'),
        headers: _headers(), body: jsonEncode({'content': content, 'extra': extra}));
    final d = await _decode(r) as Map<String, dynamic>;
    return d['id'] as int;
  }

  Future<void> updateItem(int id, {String? content, String? extra, bool? ischecked}) async {
    final body = <String, dynamic>{};
    if (content != null) body['content'] = content;
    if (extra != null) body['extra'] = extra;
    if (ischecked != null) body['ischecked'] = ischecked;
    final r = await http.patch(_u('/api/data/item/$id'),
        headers: _headers(), body: jsonEncode(body));
    await _decode(r);
  }

  Future<void> deleteItem(int id) async {
    final r = await http.delete(_u('/api/data/item/$id'), headers: _headers(json: false));
    await _decode(r);
  }

  Future<void> resetList(String listName) async {
    final r = await http.delete(_u('/api/data/$listName'), headers: _headers(json: false));
    await _decode(r);
  }

  // ── TASKS ───────────────────────────────────────────────────────────────
  Future<int> addTask(String content) async {
    final r = await http.post(_u('/api/tasks'),
        headers: _headers(), body: jsonEncode({'content': content}));
    final d = await _decode(r) as Map<String, dynamic>;
    return d['id'] as int;
  }

  Future<int> addSubtask(int taskId, String content) async {
    final r = await http.post(_u('/api/tasks/$taskId/subtasks'),
        headers: _headers(), body: jsonEncode({'content': content}));
    final d = await _decode(r) as Map<String, dynamic>;
    return d['id'] as int;
  }

  Future<void> toggleSubtask(int id, bool checked) async {
    final r = await http.patch(_u('/api/subtasks/$id'),
        headers: _headers(), body: jsonEncode({'ischecked': checked}));
    await _decode(r);
  }

  Future<void> deleteSubtask(int id) async {
    final r = await http.delete(_u('/api/subtasks/$id'), headers: _headers(json: false));
    await _decode(r);
  }

  // ── AI ──────────────────────────────────────────────────────────────────
  /// kind ∈ {'define','answer','ingredients','instructions'}
  Future<String> ai(String kind, String text, {required String lang}) async {
    final r = await http.post(_u('/api/ai'),
        headers: _headers(),
        body: jsonEncode({'kind': kind, 'text': text, 'lang': lang}));
    final d = await _decode(r) as Map<String, dynamic>;
    return (d['text'] as String?) ?? '';
  }
}

class AuthResult {
  AuthResult({required this.token, required this.username, required this.isNew});
  final String token;
  final String username;
  final bool isNew;
}
