-- Script Completo do Banco de Dados: SIS-CHAMADOS LEITOS
-- Este script cria todas as tabelas necessárias e insere os dados padrão iniciais.
-- Pode ser executado em um banco de dados vazio ou existente (não apagará dados existentes).

CREATE DATABASE IF NOT EXISTS `hospital_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hospital_system`;

-- 1. Tabela de Usuários Administrativos
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Alas/Setores
CREATE TABLE IF NOT EXISTS `wards` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Leitos
CREATE TABLE IF NOT EXISTS `beds` (
  `id` varchar(36) NOT NULL,
  `number` varchar(20) NOT NULL,
  `ward` varchar(100) NOT NULL,
  `room` varchar(50) NOT NULL,
  `status` enum('available','occupied','maintenance','reserved') DEFAULT 'available',
  `patient_name` varchar(255) DEFAULT NULL,
  `show_in_room` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_bed_number` (`number`),
  KEY `idx_ward` (`ward`),
  CONSTRAINT `beds_ibfk_1` FOREIGN KEY (`ward`) REFERENCES `wards` (`name`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Tipos de Chamados
CREATE TABLE IF NOT EXISTS `call_types` (
  `id` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `priority` enum('emergency','urgent','routine') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Chamados Ativos e Histórico Principal
CREATE TABLE IF NOT EXISTS `calls` (
  `id` varchar(36) NOT NULL,
  `bed_id` varchar(36) NOT NULL,
  `bed_number` varchar(20) NOT NULL,
  `patient_name` varchar(255) NOT NULL,
  `call_type` varchar(50) NOT NULL,
  `priority` enum('emergency','urgent','routine') NOT NULL,
  `status` enum('pending','seen','attending','completed') DEFAULT 'pending',
  `ward` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `seen_at` timestamp NULL DEFAULT NULL,
  `attending_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bed_id` (`bed_id`),
  KEY `call_type` (`call_type`),
  CONSTRAINT `calls_ibfk_1` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE CASCADE,
  CONSTRAINT `calls_ibfk_2` FOREIGN KEY (`call_type`) REFERENCES `call_types` (`code`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela de Log/Histórico de Ações nos Chamados
CREATE TABLE IF NOT EXISTS `call_history` (
  `id` varchar(36) NOT NULL,
  `call_id` varchar(36) NOT NULL,
  `action` enum('created','seen','attending','completed') NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_call_id` (`call_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Configurações de Acesso ao Dispositivo (Tablet/Celular)
CREATE TABLE IF NOT EXISTS `device_settings` (
  `id` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL DEFAULT 'admin123',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Configurações de Atualização da Tela de Enfermagem
CREATE TABLE IF NOT EXISTS `refresh_settings` (
  `id` varchar(36) NOT NULL DEFAULT 'default',
  `enabled` tinyint(1) DEFAULT 1,
  `interval_seconds` int(11) DEFAULT 30,
  `timezone` varchar(50) DEFAULT 'America/Sao_Paulo',
  `company_name` varchar(255) DEFAULT 'HOSPITAL SYSTEM',
  `logo_url` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Configurações de Som de Alertas
CREATE TABLE IF NOT EXISTS `sound_settings` (
  `id` varchar(36) NOT NULL DEFAULT 'default',
  `enabled` tinyint(1) DEFAULT 1,
  `volume` decimal(3,2) DEFAULT 0.80,
  `emergency_sound` enum('beep','alarm','chime','siren','bell','code_blue','pulse','high_alert') DEFAULT 'siren',
  `urgent_sound` enum('beep','alarm','chime','siren','bell','code_blue','pulse','high_alert') DEFAULT 'alarm',
  `routine_sound` enum('beep','alarm','chime','siren','bell','code_blue','pulse','high_alert') DEFAULT 'beep',
  `repeat_interval_seconds` int(11) DEFAULT 20,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Configurações Globais do Sistema (Nome da Empresa e Logo)
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` varchar(36) NOT NULL DEFAULT 'default',
  `company_name` varchar(255) DEFAULT 'HOSPITAL SYSTEM',
  `logo_url` varchar(255) DEFAULT NULL,
  `primary_color` varchar(50) DEFAULT '#0ea5e9',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Controle de Sessões de Usuários
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- INSERÇÃO DE DADOS PADRÃO (Utilizando IGNORE para não duplicar/sobrescrever)
-- =====================================================================

-- Usuário Admin Padrão (Senha: admin123)
INSERT IGNORE INTO `admin_users` (`id`, `name`, `email`, `password`) VALUES 
('admin1', 'Administrador', 'admin@hospital.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');

-- Configurações Iniciais
INSERT IGNORE INTO `device_settings` (`id`, `password`) VALUES ('default', 'admin123');
INSERT IGNORE INTO `refresh_settings` (`id`, `enabled`, `interval_seconds`, `timezone`, `company_name`, `logo_url`) VALUES ('default', 1, 30, 'America/Sao_Paulo', 'HOSPITAL SYSTEM', NULL);
INSERT IGNORE INTO `sound_settings` (`id`, `enabled`, `volume`, `emergency_sound`, `urgent_sound`, `routine_sound`, `repeat_interval_seconds`) VALUES ('default', 1, 0.80, 'high_alert', 'alarm', 'beep', 15);
INSERT IGNORE INTO `system_settings` (`id`, `company_name`, `logo_url`, `primary_color`) VALUES ('default', 'HOSPITAL SYSTEM', NULL, '#0ea5e9');

-- Alas Iniciais
INSERT IGNORE INTO `wards` (`id`, `name`, `description`) VALUES 
('ward-emergencia', 'Emergência', 'Pronto Socorro'),
('ward-enfermaria', 'Enfermaria', 'Enfermaria Geral'),
('ward-maternidade', 'Maternidade', 'Ala de Maternidade'),
('ward-pediatria', 'Pediatria', 'Ala Pediátrica'),
('ward-uti', 'UTI', 'Unidade de Terapia Intensiva');

-- Tipos de Chamados Iniciais
INSERT IGNORE INTO `call_types` (`id`, `code`, `name`, `priority`) VALUES 
('type-bed', 'bed', 'Ajustar Leito', 'routine'),
('type-emergency', 'emergency', 'Emergência', 'emergency'),
('type-hygiene', 'hygiene', 'Higiene', 'routine'),
('type-pain', 'pain', 'Dor', 'urgent'),
('type-water', 'water', 'Água', 'routine');
