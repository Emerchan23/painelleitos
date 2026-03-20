import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'settings_page.dart';
import 'api_service.dart';

class BlinkAnimation extends StatefulWidget {
  final Widget child;
  const BlinkAnimation({super.key, required this.child});

  @override
  State<BlinkAnimation> createState() => _BlinkAnimationState();
}

class _BlinkAnimationState extends State<BlinkAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(opacity: _controller, child: widget.child);
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String _bedToken = '';
  List<CallModel> _activeCalls = [];
  Timer? _timer;
  bool _isConnected = false;

  // Informações de exibição
  String _displayTitle = 'Não configurado';
  String _displaySubtitle = 'Configure o Token';
  bool _isRoomMode = false;
  List<Map<String, dynamic>> _roomBeds = [];

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _startPolling();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _bedToken = prefs.getString('bed_token') ?? '';
    });

    if (_bedToken.isNotEmpty) {
      _syncDeviceData(_bedToken);
    } else {
      setState(() {
        _displayTitle = 'Não configurado';
        _displaySubtitle = 'Vá em configurações e insira o Token';
        _isRoomMode = false;
        _roomBeds = [];
      });
    }

    _fetchCalls();
  }

  Future<void> _syncDeviceData(String token) async {
    final result = await ApiService.syncBedInfoDetailed(token);
    
    if (result != null && mounted) {
      setState(() {
        if (result['type'] == 'room') {
          _isRoomMode = true;
          _displayTitle = 'Quarto ${result['room']}';
          _displaySubtitle = result['ward'] ?? '';
          _roomBeds = List<Map<String, dynamic>>.from(result['beds'] ?? []);
        } else if (result['type'] == 'bed' && result['beds'].isNotEmpty) {
          _isRoomMode = false;
          final bed = result['beds'][0];
          final number = bed['number'] ?? '';
          final room = bed['room'] ?? '';
          final ward = bed['ward'] ?? '';

          if (number.isNotEmpty && number != room) {
            _displayTitle = 'Leito $number';
            _displaySubtitle = '$room - $ward';
          } else {
            _displayTitle = 'Quarto $room';
            _displaySubtitle = ward;
          }
          _roomBeds = [bed];
        }
      });
    }
  }

  bool _isDialogVisible = false;

  void _startPolling() {
    _timer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (_bedToken.isNotEmpty && !_isDialogVisible) {
        _fetchCalls();
      }
    });
  }

  Future<void> _fetchCalls() async {
    if (_bedToken.isEmpty) return;

    if (_isRoomMode) {
      // Se for quarto, busca os chamados de todos os leitos do quarto
      List<CallModel> allCalls = [];
      for (var bed in _roomBeds) {
        final calls = await ApiService.getActiveCalls(bed['id']);
        allCalls.addAll(calls);
      }
      if (mounted) {
        setState(() {
          _activeCalls = allCalls;
          _isConnected = true;
        });
      }
    } else {
      // Modo normal de leito
      final calls = await ApiService.getActiveCalls(_bedToken);

      if (mounted) {
        setState(() {
          _activeCalls = calls;
          _isConnected = true;
        });
      }
    }
  }

  Future<void> _showPasswordDialog() async {
    setState(() {
      _isDialogVisible = true;
    });

    final TextEditingController passwordController = TextEditingController();
    String? errorMessage;
    bool isVerifying = false;
    bool obscureText = true;

    try {
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) {
          return StatefulBuilder(
            builder: (dialogContext, setStateDialog) {
              Future<void> submitPassword() async {
                if (passwordController.text.isEmpty) return;

                setStateDialog(() {
                  isVerifying = true;
                  errorMessage = null;
                });

                final result = await ApiService.verifyPassword(
                  passwordController.text,
                );

                if (!dialogContext.mounted) return;

                if (result['success'] == true) {
                  Navigator.pop(dialogContext);
                  if (!mounted) return;
                  final settingsResult = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const SettingsPage(),
                    ),
                  );
                  if (settingsResult == true) {
                    _loadSettings();
                  }
                } else {
                  setStateDialog(() {
                    isVerifying = false;
                    errorMessage = result['message'];
                  });
                }
              }

              return AlertDialog(
                title: const Text('Acesso Restrito'),
                scrollable: true,
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Digite a senha para acessar as configurações:'),
                    const SizedBox(height: 16),
                    TextField(
                      controller: passwordController,
                      obscureText: obscureText,
                      keyboardType: TextInputType.number,
                      autofocus: true,
                      onSubmitted: (_) => submitPassword(),
                      decoration: InputDecoration(
                        border: const OutlineInputBorder(),
                        labelText: 'Senha',
                        errorText: errorMessage,
                        suffixIcon: IconButton(
                          icon: Icon(
                            obscureText ? Icons.visibility : Icons.visibility_off,
                          ),
                          onPressed: () {
                            setStateDialog(() {
                              obscureText = !obscureText;
                            });
                          },
                        ),
                      ),
                    ),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () {
                      Navigator.pop(dialogContext);
                    },
                    child: const Text('Cancelar'),
                  ),
                  ElevatedButton(
                    onPressed: isVerifying ? null : submitPassword,
                    child: isVerifying
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Acessar'),
                  ),
                ],
              );
            },
          );
        },
      );
    } finally {
      if (mounted) {
        setState(() {
          _isDialogVisible = false;
        });
      }
    }
  }

  Future<void> _handleCall(String type) async {
    if (_bedToken.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Por favor, configure o Token primeiro.'),
        ),
      );
      return;
    }

    if (_isRoomMode) {
      // Se for modo quarto, mas tiver apenas 1 leito, vai direto
      if (_roomBeds.length == 1) {
        await _executeCall(_roomBeds[0]['id'], type);
        return;
      }

      // Se tiver mais de 1 leito, abre a seleção
      await _showBedSelectionDialog(type);
      return;
    }

    // Modo leito único
    await _executeCall(_bedToken, type);
  }

  Future<void> _executeCall(String token, String type) async {
    // Check if already active
    if (_activeCalls.any((c) => c.callType == type)) {
      return;
    }

    final result = await ApiService.createCall(token, type);
    if (!mounted) return;

    if (result['success'] == true) {
      _fetchCalls();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Chamado enviado com sucesso!'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 3),
        ),
      );
    } else {
      final errorMessage = result['message'] ?? 'Verifique a conexão.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro: $errorMessage'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _showBedSelectionDialog(String callType) async {
    if (_roomBeds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Nenhum leito ativo configurado para este quarto.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    String title;
    switch (callType) {
      case 'pain':
        title = 'Qual leito está sentindo Dor?';
        break;
      case 'hygiene':
        title = 'Qual leito precisa de Higiene?';
        break;
      case 'water':
        title = 'Qual leito precisa de Água?';
        break;
      case 'bed':
        title = 'Qual leito precisa de Ajuste?';
        break;
      case 'emergency':
        title = 'Qual leito está em Emergência?';
        break;
      default:
        title = 'Selecione o Leito';
    }

    await showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(
            title,
            textAlign: TextAlign.center,
          ),
          content: SizedBox(
            width: double.maxFinite,
            child: GridView.builder(
              shrinkWrap: true,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: _roomBeds.length,
              itemBuilder: (context, index) {
                final bed = _roomBeds[index];
                return ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade100,
                    foregroundColor: Colors.blue.shade900,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () {
                    Navigator.pop(context);
                    _executeCall(bed['id'], callType);
                  },
                  child: Text(
                    'Leito ${bed['number']}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar', style: TextStyle(fontSize: 16)),
            ),
          ],
        );
      },
    );
  }

  CallModel? _getCallStatus(String type) {
    try {
      if (_isRoomMode) {
        // No modo quarto, pode haver múltiplos chamados do mesmo tipo (um de cada leito)
        // Vamos retornar o mais recente ou apenas o primeiro que encontrar para exibir o status visual
        final callsOfType = _activeCalls.where((c) => c.callType == type).toList();
        if (callsOfType.isNotEmpty) {
          return callsOfType.first;
        }
        return null;
      }
      return _activeCalls.firstWhere((c) => c.callType == type);
    } catch (e) {
      return null;
    }
  }

  Widget _buildStatusBadge(CallModel call) {
    Color bgColor = Colors.white;
    Color textColor = Colors.black;
    String label = _isRoomMode ? 'Leito ${call.bedNumber}\nEnviado' : 'Enviado';
    IconData icon = Icons.check;

    if (call.status == 'seen') {
      bgColor = Colors.blue.shade100;
      textColor = Colors.blue.shade900;
      label = _isRoomMode ? 'Leito ${call.bedNumber}\nVisto' : 'Visto';
      icon = Icons.visibility;
    } else if (call.status == 'attending') {
      bgColor = Colors.green.shade100;
      textColor = Colors.green.shade900;
      label = _isRoomMode ? 'Leito ${call.bedNumber}\nAtendendo' : 'Atendendo';
      icon = Icons.favorite;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: textColor),
          const SizedBox(width: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: textColor,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      body: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _displayTitle,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          _displaySubtitle,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        if (_isRoomMode) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: Colors.blue.shade200),
                            ),
                            child: Text(
                              'Modo Quarto (${_roomBeds.length} leitos)',
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.blue.shade700,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ]
                      ],
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(
                      Icons.circle,
                      size: 14,
                      color: _isConnected ? Colors.green : Colors.red,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _isConnected ? 'Conectado' : 'Desconectado',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 16),
                    // Hidden settings button (long press or double tap usually, but keeping it visible for setup)
                    IconButton(
                      icon: const Icon(Icons.settings, color: Colors.grey),
                      onPressed: _showPasswordDialog,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Main Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  // Outros botões grid (Lado esquerdo)
                  Expanded(
                    flex: 2,
                    child: Column(
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Expanded(
                                child: _buildCallButton(
                                  'pain',
                                  'Dor',
                                  Icons.monitor_heart,
                                  Colors.orange,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: _buildCallButton(
                                  'hygiene',
                                  'Higiene',
                                  Icons.bathtub,
                                  Colors.blue,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        Expanded(
                          child: Row(
                            children: [
                              Expanded(
                                child: _buildCallButton(
                                  'water',
                                  'Água',
                                  Icons.water_drop,
                                  Colors.cyan,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: _buildCallButton(
                                  'bed',
                                  'Ajustar Leito',
                                  Icons.bed,
                                  Colors.indigo,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Emergency Button (Lado direito, grande)
                  Expanded(flex: 1, child: _buildEmergencyButton()),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmergencyButton() {
    final call = _getCallStatus('emergency');
    final isActive = call != null;

    Widget buttonContent = Container(
      padding: const EdgeInsets.all(8), // Reduzido de 16 para 8
      child: LayoutBuilder(
        builder: (context, constraints) {
          final iconSize = constraints.maxHeight * 0.35;
          final fontSize =
              constraints.maxHeight * 0.085; // Reduzido de 0.10 para 0.085

          return Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.warning_amber_rounded,
                size: iconSize,
                color: Colors.white,
              ),
              SizedBox(height: constraints.maxHeight * 0.05),
              FittedBox(
                // Adicionado FittedBox para garantir que o texto caiba
                fit: BoxFit.scaleDown,
                child: Text(
                  'EMERGÊNCIA\nSOS',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: fontSize,
                    fontWeight: FontWeight.bold,
                    height: 1.1,
                  ),
                ),
              ),
              if (isActive) ...[
                SizedBox(height: constraints.maxHeight * 0.05),
                _buildStatusBadge(call),
              ],
            ],
          );
        },
      ),
    );

    return Material(
      color: isActive ? Colors.red.shade300 : Colors.red,
      borderRadius: BorderRadius.circular(24),
      elevation: isActive ? 2 : 8,
      child: InkWell(
        onTap: isActive ? null : () => _handleCall('emergency'),
        borderRadius: BorderRadius.circular(24),
        child: isActive ? BlinkAnimation(child: buttonContent) : buttonContent,
      ),
    );
  }

  Widget _buildCallButton(
    String type,
    String label,
    IconData icon,
    MaterialColor color,
  ) {
    final call = _getCallStatus(type);
    final isActive = call != null;

    Widget buttonContent = Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isActive ? Colors.transparent : color.shade200,
          width: 2,
        ),
      ),
      child: Stack(
        children: [
          Center(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final iconSize = constraints.maxHeight * 0.35;
                final fontSize = constraints.maxHeight * 0.15;

                return Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      icon,
                      size: iconSize,
                      color: isActive ? Colors.grey.shade500 : color.shade600,
                    ),
                    SizedBox(height: constraints.maxHeight * 0.08),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: fontSize,
                        fontWeight: FontWeight.bold,
                        color: isActive ? Colors.grey.shade600 : Colors.black87,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          if (isActive)
            Positioned(top: 12, right: 12, child: _buildStatusBadge(call)),
        ],
      ),
    );

    return Material(
      color: isActive ? Colors.grey.shade300 : Colors.white,
      borderRadius: BorderRadius.circular(24),
      elevation: isActive ? 1 : 4,
      child: InkWell(
        onTap: isActive ? null : () => _handleCall(type),
        borderRadius: BorderRadius.circular(24),
        child: isActive ? BlinkAnimation(child: buttonContent) : buttonContent,
      ),
    );
  }
}
