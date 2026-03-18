import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class CallModel {
  final String id;
  final String bedNumber;
  final String? room;
  final String patientName;
  final String callType;
  final String priority;
  final String status;
  final String? ward;

  CallModel({
    required this.id,
    required this.bedNumber,
    this.room,
    required this.patientName,
    required this.callType,
    required this.priority,
    required this.status,
    this.ward,
  });

  factory CallModel.fromJson(Map<String, dynamic> json) {
    return CallModel(
      id: json['id']?.toString() ?? '',
      bedNumber: json['bedNumber']?.toString() ?? '',
      room: json['room']?.toString(),
      patientName: json['patientName']?.toString() ?? '',
      callType: json['callType']?.toString() ?? '',
      priority: json['priority']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      ward: json['ward']?.toString(),
    );
  }
}

class ApiService {
  static Future<String> _getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    String url = prefs.getString('server_url') ?? 'http://192.168.1.100:3000';
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    return url;
  }

  static Future<Map<String, dynamic>> testConnectionDetailed(String url) async {
    try {
      if (url.endsWith('/')) {
        url = url.substring(0, url.length - 1);
      }

      print('Testando conexão com: $url/api/calls');

      final response = await http
          .get(Uri.parse('$url/api/calls'))
          .timeout(const Duration(seconds: 5)); // Aumentei para 5s

      print('Status Code: ${response.statusCode}');

      if (response.statusCode == 200 ||
          response.statusCode == 400 ||
          response.statusCode == 404) {
        return {'success': true, 'message': 'Conectado!'};
      } else {
        return {
          'success': false,
          'message': 'Erro HTTP ${response.statusCode}',
        };
      }
    } catch (e) {
      print('Erro de conexão: $e');
      return {'success': false, 'message': 'Erro: $e'};
    }
  }

  static Future<bool> testConnection(String url) async {
    final result = await testConnectionDetailed(url);
    return result['success'];
  }

  static Future<Map<String, dynamic>> verifyPassword(String password) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse('$baseUrl/api/settings/device/verify');

      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'password': password}),
          )
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        return {'success': true};
      } else if (response.statusCode == 401) {
        return {'success': false, 'message': 'Senha incorreta'};
      } else {
        return {'success': false, 'message': 'Erro no servidor: ${response.statusCode}'};
      }
    } catch (e) {
      // Se não conseguir conectar ao servidor (offline ou IP incorreto),
      // aceitar a senha padrão para permitir que o usuário configure o IP.
      if (password == '123456' || password == 'admin123') {
        return {'success': true, 'fallback': true};
      }
      return {
        'success': false,
        'message': 'Erro de conexão. Apenas a senha mestre é aceita offline.',
      };
    }
  }

  static Future<List<CallModel>> getActiveCalls(String token) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse(
        '$baseUrl/api/calls?token=${Uri.encodeComponent(token)}&active=true',
      );
      final response = await http.get(url).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true &&
            data['data'] != null &&
            data['data']['calls'] != null) {
          final List callsJson = data['data']['calls'];
          return callsJson.map((json) => CallModel.fromJson(json)).toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching calls: $e');
      return [];
    }
  }

  static Future<List<String>> getWards() async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse('$baseUrl/api/wards');
      final response = await http.get(url).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true &&
            data['data'] != null &&
            data['data']['wards'] != null) {
          final List wardsJson = data['data']['wards'];
          return wardsJson.map((w) => w['name'].toString()).toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching wards: $e');
      return [];
    }
  }

  static Future<List<Map<String, dynamic>>> getBeds(String ward) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse(
        '$baseUrl/api/beds?ward=${Uri.encodeComponent(ward)}',
      );
      final response = await http.get(url).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true &&
            data['data'] != null &&
            data['data']['beds'] != null) {
          final List bedsJson = data['data']['beds'];
          return bedsJson.cast<Map<String, dynamic>>();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching beds: $e');
      return [];
    }
  }

  static Future<Map<String, dynamic>?> syncBedInfoDetailed(String token) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse(
        '$baseUrl/api/beds?id=${Uri.encodeComponent(token)}',
      );
      final response = await http.get(url).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return data['data']; // Returns { type: 'room'|'bed', beds: [...], ward?: ..., room?: ... }
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error syncing bed info detailed: $e');
      return null;
    }
  }

  static Future<Map<String, dynamic>?> syncBedInfo(String token) async {
    try {
      final baseUrl = await _getBaseUrl();
      // Buscar pelo ID (token)
      final url = Uri.parse(
        '$baseUrl/api/beds?id=${Uri.encodeComponent(token)}',
      );
      final response = await http.get(url).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true &&
            data['data'] != null &&
            data['data']['beds'] != null) {
          final List bedsJson = data['data']['beds'];
          if (bedsJson.isNotEmpty) {
            return bedsJson.first as Map<String, dynamic>;
          }
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error syncing bed info: $e');
      return null;
    }
  }

  static Future<Map<String, dynamic>> createCall(
    String token,
    String callType,
  ) async {
    try {
      final baseUrl = await _getBaseUrl();
      final url = Uri.parse('$baseUrl/api/calls');

      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'token': token,
              'patientName': 'Paciente', // Valor padrão, já que não temos mais tela para isso no tablet
              'callType': callType,
            }),
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 201) {
        return {'success': true};
      }

      try {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['error'] ?? 'Erro desconhecido pelo servidor',
        };
      } catch (_) {
        return {
          'success': false,
          'message': 'Erro no servidor: ${response.statusCode}',
        };
      }
    } catch (e) {
      debugPrint('Error creating call: $e');
      return {'success': false, 'message': 'Erro de conexão'};
    }
  }
}
