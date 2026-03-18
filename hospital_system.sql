-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db:3306
-- Tempo de geração: 18/03/2026 às 10:17
-- Versão do servidor: 10.6.25-MariaDB-ubu2204
-- Versão do PHP: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `hospital_system`
--

DELIMITER $$
--
-- Procedimentos
--
CREATE DEFINER=`root`@`%` PROCEDURE `sp_cleanup_expired_sessions` ()   BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_create_call` (IN `p_bed_number` VARCHAR(20), IN `p_patient_name` VARCHAR(255), IN `p_call_type` VARCHAR(50), IN `p_ward` VARCHAR(100))   BEGIN
    DECLARE v_id VARCHAR(36);
    DECLARE v_bed_id VARCHAR(36);
    DECLARE v_priority VARCHAR(20);
    
    SET v_id = UUID();
    
    -- Buscar ID do leito
    SELECT id INTO v_bed_id FROM beds WHERE number = p_bed_number LIMIT 1;
    
    -- Buscar prioridade do tipo de chamado
    SELECT priority INTO v_priority FROM call_types WHERE code = p_call_type LIMIT 1;
    
    -- Se não encontrar prioridade, usar 'routine'
    IF v_priority IS NULL THEN
        SET v_priority = 'routine';
    END IF;
    
    -- Criar o chamado
    INSERT INTO calls (id, bed_id, bed_number, patient_name, call_type, priority, status, ward)
    VALUES (v_id, v_bed_id, p_bed_number, p_patient_name, p_call_type, v_priority, 'pending', p_ward);
    
    SELECT v_id as id;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `sp_update_call_status` (IN `p_call_id` VARCHAR(36), IN `p_status` VARCHAR(20))   BEGIN
    UPDATE calls 
    SET 
        status = p_status,
        seen_at = CASE WHEN p_status = 'seen' AND seen_at IS NULL THEN NOW() ELSE seen_at END,
        attending_at = CASE WHEN p_status = 'attending' AND attending_at IS NULL THEN NOW() ELSE attending_at END,
        completed_at = CASE WHEN p_status = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END
    WHERE id = p_call_id;
    
    SELECT * FROM calls WHERE id = p_call_id;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estrutura para tabela `admin_users`
--

CREATE TABLE `admin_users` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `admin_users`
--

INSERT INTO `admin_users` (`id`, `name`, `email`, `password`, `created_at`, `updated_at`) VALUES
('437cf962-cd28-4675-a59a-f3ae0d1e6237', 'Emerson', 'emerson.lpsantos@gmail.com', '$2a$10$/53bHEdBbMvulYMTnK2foOkCVUmRxOZkEgf3fkSR2M13q9TUpZq7O', '2026-03-18 01:56:20', '2026-03-18 01:56:20'),
('a4712fa9-02f8-4095-89c1-a646da209fb4', 'CPD', 'cpd6089@gmail.com', '$2a$10$VwQgRyNDdSmm7FRSEjgfx.b1VuVI0NpeOHbktmk.6zKvd9qjKB5L.', '2026-03-18 10:56:47', '2026-03-18 10:56:47'),
('admin1', 'Administrador', 'admin@hospital.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '2026-03-18 01:31:54', '2026-03-18 01:31:54');

-- --------------------------------------------------------

--
-- Estrutura para tabela `beds`
--

CREATE TABLE `beds` (
  `id` varchar(36) NOT NULL,
  `number` varchar(20) NOT NULL,
  `ward` varchar(100) NOT NULL,
  `room` varchar(50) NOT NULL,
  `status` enum('available','occupied','maintenance','reserved') DEFAULT 'available',
  `patient_name` varchar(255) DEFAULT NULL,
  `show_in_room` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `beds`
--

INSERT INTO `beds` (`id`, `number`, `ward`, `room`, `status`, `patient_name`, `show_in_room`, `created_at`, `updated_at`) VALUES
('aec56cec-a05d-40d1-a66c-e2d59b50a4b7', '3333', 'Maternidade', '333', 'available', NULL, 1, '2026-03-18 01:56:51', '2026-03-18 01:56:51'),
('bed-1', '101', 'UTI', 'A1', 'occupied', 'Maria Silva', 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36'),
('bed-10', '501', 'Emergência', 'E1', 'occupied', 'Roberto Lima', 1, '2026-03-18 12:48:29', '2026-03-18 12:48:29'),
('bed-11', '502', 'Emergência', 'E1', 'reserved', NULL, 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36'),
('bed-12', '503', 'Emergência', 'E2', 'available', NULL, 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36'),
('bed-2', '102', 'UTI', 'A1', 'occupied', 'João Santos', 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36'),
('bed-3', '103', 'UTI', 'A2', 'available', NULL, 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36'),
('bed-4', '201', 'Enfermaria', 'B1', 'occupied', 'Ana Oliveira', 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36'),
('bed-5', '202', 'Enfermaria', 'B1', 'occupied', 'Pedro Costa', 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36'),
('bed-6', '203', 'Enfermaria', 'B2', 'maintenance', NULL, 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36'),
('bed-7', '301', 'Pediatria', 'C1', 'occupied', 'Lucas Mendes', 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36'),
('bed-8', '302', 'Pediatria', 'C1', 'available', NULL, 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36'),
('bed-9', '401', 'Maternidade', 'D1', 'occupied', 'Carla Souza', 1, '2026-03-18 01:20:36', '2026-03-18 01:20:36');

-- --------------------------------------------------------

--
-- Estrutura para tabela `calls`
--

CREATE TABLE `calls` (
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
  `completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `calls`
--

INSERT INTO `calls` (`id`, `bed_id`, `bed_number`, `patient_name`, `call_type`, `priority`, `status`, `ward`, `created_at`, `seen_at`, `attending_at`, `completed_at`) VALUES
('02084bea-8b38-4d77-92d4-018e84b62fcb', 'bed-1', '101', 'Sala 1', 'pain', 'urgent', 'completed', 'UTI', '2026-03-18 02:08:31', NULL, '2026-03-18 02:09:20', '2026-03-18 02:09:22'),
('062b3ef4-80ed-478c-93f8-bdf0d9fe0ce7', 'bed-1', '101', 'A1', 'hygiene', 'routine', 'completed', 'UTI', '2026-03-18 11:11:31', NULL, '2026-03-18 11:11:37', '2026-03-18 11:11:39'),
('172558ac-ac05-46a5-8c42-ae9a804bbadc', 'bed-1', '101', 'Sala 1', 'emergency', 'emergency', 'completed', 'UTI', '2026-03-18 02:22:16', NULL, '2026-03-18 02:22:34', '2026-03-18 02:22:36'),
('1de6c7ab-0ff5-4825-98fe-025586855650', 'bed-1', '101', 'A1', 'bed', 'routine', 'pending', 'UTI', '2026-03-18 12:30:25', NULL, NULL, NULL),
('231b1b37-1b94-4efa-8f50-fd8edb94ae40', 'bed-1', '101', 'A1', 'water', 'routine', 'completed', 'UTI', '2026-03-18 11:18:15', '2026-03-18 11:18:51', '2026-03-18 11:18:53', '2026-03-18 11:18:55'),
('31467233-66d4-432c-96c4-5412d3caec89', 'bed-1', '101', 'Sala 1', 'emergency', 'emergency', 'completed', 'UTI', '2026-03-18 02:05:22', NULL, '2026-03-18 02:06:26', '2026-03-18 02:06:26'),
('341ff25e-2407-44ef-9c15-70c198d8813d', 'bed-1', '101', 'A1', 'water', 'routine', 'completed', 'UTI', '2026-03-18 11:28:00', NULL, '2026-03-18 12:03:01', '2026-03-18 12:03:01'),
('594004f0-3e1c-4a54-a805-d95509d475a4', 'bed-1', '101', 'Sala 1', 'water', 'routine', 'completed', 'UTI', '2026-03-18 02:00:44', NULL, '2026-03-18 02:01:57', '2026-03-18 02:01:58'),
('66cd0488-5699-4960-96bd-dbaa3a56424f', 'bed-1', '101', 'Sala 1', 'bed', 'routine', 'completed', 'UTI', '2026-03-18 02:08:53', '2026-03-18 02:09:13', '2026-03-18 02:09:14', '2026-03-18 02:09:16'),
('711b3d87-c9d7-43eb-9288-fb56ebf258b4', 'bed-1', '101', 'A1', 'water', 'routine', 'completed', 'UTI', '2026-03-18 10:58:31', NULL, '2026-03-18 10:58:39', '2026-03-18 10:58:39'),
('74bcb0a3-9c96-4dc7-9c06-2e25491c0d4c', 'bed-1', '101', 'A1', 'bed', 'routine', 'completed', 'UTI', '2026-03-18 11:28:02', NULL, '2026-03-18 12:03:02', '2026-03-18 12:03:03'),
('7c3ec440-2d21-441d-b9b9-dd2bc28d2f5e', 'bed-1', '101', 'A1', 'hygiene', 'routine', 'pending', 'UTI', '2026-03-18 12:30:25', NULL, NULL, NULL),
('7eab0473-0aac-4715-bb1e-dba5f360d45e', 'bed-1', '101', 'A1', 'hygiene', 'routine', 'completed', 'UTI', '2026-03-18 10:58:28', NULL, '2026-03-18 10:58:38', '2026-03-18 10:58:38'),
('92f50054-523d-42b3-afaa-e206387ac97c', 'bed-1', '101', 'A1', 'pain', 'urgent', 'completed', 'UTI', '2026-03-18 10:58:23', NULL, '2026-03-18 10:58:32', '2026-03-18 10:58:37'),
('9c4f3b50-8815-4972-a692-729f54bac58e', 'bed-1', '101', 'A1', 'hygiene', 'routine', 'completed', 'UTI', '2026-03-18 11:18:03', '2026-03-18 11:18:42', '2026-03-18 11:18:46', '2026-03-18 11:18:48'),
('a433139d-22a6-4706-845d-2f2d59e16ca9', 'bed-1', '101', 'Sala 1', 'emergency', 'emergency', 'completed', 'UTI', '2026-03-18 02:00:02', NULL, '2026-03-18 02:00:23', '2026-03-18 02:00:23'),
('a60e9811-0c6d-45c0-8c4b-28dacfe0cb27', 'bed-1', '101', 'Sala 1', 'emergency', 'emergency', 'completed', 'UTI', '2026-03-18 02:07:53', NULL, '2026-03-18 02:08:41', '2026-03-18 02:08:44'),
('b29db4af-157d-4a45-b178-322becd01f88', 'bed-1', '101', 'A1', 'emergency', 'emergency', 'completed', 'UTI', '2026-03-18 11:28:01', NULL, '2026-03-18 12:02:59', '2026-03-18 12:03:00'),
('bd8654ce-676c-4298-8b11-8d78b167a661', 'bed-1', '101', 'A1', 'pain', 'urgent', 'completed', 'UTI', '2026-03-18 11:15:40', '2026-03-18 11:18:20', '2026-03-18 11:18:27', '2026-03-18 11:18:36'),
('c7ae3f63-ed73-475d-8259-02e309302a40', 'bed-1', '101', 'A1', 'pain', 'urgent', 'completed', 'UTI', '2026-03-18 11:28:00', NULL, '2026-03-18 12:03:00', '2026-03-18 12:03:01'),
('e8c4cddf-b4f4-4b74-ba77-52c450f694eb', 'bed-1', '101', 'A1', 'hygiene', 'routine', 'completed', 'UTI', '2026-03-18 11:28:00', NULL, '2026-03-18 12:03:02', '2026-03-18 12:03:02'),
('e928e95f-af57-4466-bcf7-ece18af4a04f', 'bed-1', '101', 'A1', 'bed', 'routine', 'completed', 'UTI', '2026-03-18 10:58:19', NULL, '2026-03-18 10:58:38', '2026-03-18 10:58:38'),
('edee3124-bf2f-4f34-87da-2fbc9fea3022', 'bed-1', '101', 'Sala 1', 'pain', 'urgent', 'completed', 'UTI', '2026-03-18 01:25:36', NULL, '2026-03-18 01:26:46', '2026-03-18 01:26:46'),
('f1f6d833-1d64-4f16-b46c-e249c40dd0b8', 'bed-1', '101', 'Sala 1', 'hygiene', 'routine', 'completed', 'UTI', '2026-03-18 02:08:38', NULL, '2026-03-18 02:09:17', '2026-03-18 02:09:19'),
('f6a771d8-5e7e-4788-8564-d1f21fe1b8de', 'bed-1', '101', 'A1', 'hygiene', 'routine', 'completed', 'UTI', '2026-03-18 11:10:17', NULL, '2026-03-18 11:10:20', '2026-03-18 11:10:20'),
('fa96a524-40da-43b7-af07-4a3fb0433b02', 'bed-1', '101', 'Sala 1', 'water', 'routine', 'completed', 'UTI', '2026-03-18 02:08:47', '2026-03-18 02:09:10', '2026-03-18 02:09:11', '2026-03-18 02:09:12');

--
-- Acionadores `calls`
--
DELIMITER $$
CREATE TRIGGER `tr_call_created` AFTER INSERT ON `calls` FOR EACH ROW BEGIN
    INSERT INTO call_history (id, call_id, action, details)
    VALUES (UUID(), NEW.id, 'created', CONCAT('Chamado criado - Tipo: ', NEW.call_type, ', Prioridade: ', NEW.priority));
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tr_call_status_changed` AFTER UPDATE ON `calls` FOR EACH ROW BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO call_history (id, call_id, action, details)
        VALUES (UUID(), NEW.id, NEW.status, CONCAT('Status alterado de ', OLD.status, ' para ', NEW.status));
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estrutura para tabela `call_history`
--

CREATE TABLE `call_history` (
  `id` varchar(36) NOT NULL,
  `call_id` varchar(36) NOT NULL,
  `action` enum('created','seen','attending','completed') NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `call_history`
--

INSERT INTO `call_history` (`id`, `call_id`, `action`, `user_id`, `details`, `created_at`) VALUES
('0b98e4c3-22bb-11f1-903e-02420a000216', 'f6a771d8-5e7e-4788-8564-d1f21fe1b8de', 'created', NULL, 'Chamado criado - Tipo: hygiene, Prioridade: routine', '2026-03-18 11:10:17'),
('0d2a687f-22bb-11f1-903e-02420a000216', 'f6a771d8-5e7e-4788-8564-d1f21fe1b8de', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 11:10:20'),
('0d95bb7e-22bb-11f1-903e-02420a000216', 'f6a771d8-5e7e-4788-8564-d1f21fe1b8de', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 11:10:20'),
('11f86979-226f-11f1-9b45-02420a000206', '31467233-66d4-432c-96c4-5412d3caec89', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 02:06:26'),
('123f46db-226f-11f1-9b45-02420a000206', '31467233-66d4-432c-96c4-5412d3caec89', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 02:06:26'),
('21310739-22bc-11f1-903e-02420a000216', '9c4f3b50-8815-4972-a692-729f54bac58e', 'created', NULL, 'Chamado criado - Tipo: hygiene, Prioridade: routine', '2026-03-18 11:18:03'),
('286c2b31-22bc-11f1-903e-02420a000216', '231b1b37-1b94-4efa-8f50-fd8edb94ae40', 'created', NULL, 'Chamado criado - Tipo: water, Prioridade: routine', '2026-03-18 11:18:15'),
('2bc58645-22bc-11f1-903e-02420a000216', 'bd8654ce-676c-4298-8b11-8d78b167a661', 'seen', NULL, 'Status alterado de pending para seen', '2026-03-18 11:18:20'),
('2d63fd63-226e-11f1-9b45-02420a000206', 'a433139d-22a6-4706-845d-2f2d59e16ca9', 'created', NULL, 'Chamado criado - Tipo: emergency, Prioridade: emergency', '2026-03-18 02:00:02'),
('2fc55901-22bc-11f1-903e-02420a000216', 'bd8654ce-676c-4298-8b11-8d78b167a661', 'attending', NULL, 'Status alterado de seen para attending', '2026-03-18 11:18:27'),
('353d5dd0-22bc-11f1-903e-02420a000216', 'bd8654ce-676c-4298-8b11-8d78b167a661', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 11:18:36'),
('37f37318-22bb-11f1-903e-02420a000216', '062b3ef4-80ed-478c-93f8-bdf0d9fe0ce7', 'created', NULL, 'Chamado criado - Tipo: hygiene, Prioridade: routine', '2026-03-18 11:11:31'),
('389462d5-22bc-11f1-903e-02420a000216', '9c4f3b50-8815-4972-a692-729f54bac58e', 'seen', NULL, 'Status alterado de pending para seen', '2026-03-18 11:18:42'),
('3986bd83-226e-11f1-9b45-02420a000206', 'a433139d-22a6-4706-845d-2f2d59e16ca9', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 02:00:23'),
('39e69f7e-226e-11f1-9b45-02420a000206', 'a433139d-22a6-4706-845d-2f2d59e16ca9', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 02:00:23'),
('3b341dc0-22bc-11f1-903e-02420a000216', '9c4f3b50-8815-4972-a692-729f54bac58e', 'attending', NULL, 'Status alterado de seen para attending', '2026-03-18 11:18:46'),
('3b50f95f-22bb-11f1-903e-02420a000216', '062b3ef4-80ed-478c-93f8-bdf0d9fe0ce7', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 11:11:37'),
('3c05321c-22bc-11f1-903e-02420a000216', '9c4f3b50-8815-4972-a692-729f54bac58e', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 11:18:48'),
('3c5a4e56-22bb-11f1-903e-02420a000216', '062b3ef4-80ed-478c-93f8-bdf0d9fe0ce7', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 11:11:39'),
('3d47f118-22c6-11f1-903e-02420a000216', '7c3ec440-2d21-441d-b9b9-dd2bc28d2f5e', 'created', NULL, 'Chamado criado - Tipo: hygiene, Prioridade: routine', '2026-03-18 12:30:25'),
('3d747715-22c6-11f1-903e-02420a000216', '1de6c7ab-0ff5-4825-98fe-025586855650', 'created', NULL, 'Chamado criado - Tipo: bed, Prioridade: routine', '2026-03-18 12:30:25'),
('3dfb8e33-22bc-11f1-903e-02420a000216', '231b1b37-1b94-4efa-8f50-fd8edb94ae40', 'seen', NULL, 'Status alterado de pending para seen', '2026-03-18 11:18:51'),
('3f7ec044-22bc-11f1-903e-02420a000216', '231b1b37-1b94-4efa-8f50-fd8edb94ae40', 'attending', NULL, 'Status alterado de seen para attending', '2026-03-18 11:18:53'),
('403ba2cf-22bc-11f1-903e-02420a000216', '231b1b37-1b94-4efa-8f50-fd8edb94ae40', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 11:18:55'),
('4638346a-226f-11f1-9b45-02420a000206', 'a60e9811-0c6d-45c0-8c4b-28dacfe0cb27', 'created', NULL, 'Chamado criado - Tipo: emergency, Prioridade: emergency', '2026-03-18 02:07:53'),
('4666f218-226e-11f1-9b45-02420a000206', '594004f0-3e1c-4a54-a805-d95509d475a4', 'created', NULL, 'Chamado criado - Tipo: water, Prioridade: routine', '2026-03-18 02:00:44'),
('4825b800-2271-11f1-9b45-02420a000206', '172558ac-ac05-46a5-8c42-ae9a804bbadc', 'created', NULL, 'Chamado criado - Tipo: emergency, Prioridade: emergency', '2026-03-18 02:22:16'),
('52cd34fb-2271-11f1-9b45-02420a000206', '172558ac-ac05-46a5-8c42-ae9a804bbadc', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 02:22:34'),
('547b8b9b-2271-11f1-9b45-02420a000206', '172558ac-ac05-46a5-8c42-ae9a804bbadc', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 02:22:36'),
('5cdda723-226f-11f1-9b45-02420a000206', '02084bea-8b38-4d77-92d4-018e84b62fcb', 'created', NULL, 'Chamado criado - Tipo: pain, Prioridade: urgent', '2026-03-18 02:08:31'),
('5e061c52-2269-11f1-9b45-02420a000206', 'edee3124-bf2f-4f34-87da-2fbc9fea3022', 'created', NULL, 'Chamado criado - Tipo: pain, Prioridade: urgent', '2026-03-18 01:25:36'),
('5fe87a9f-22b9-11f1-903e-02420a000216', 'e928e95f-af57-4466-bcf7-ece18af4a04f', 'created', NULL, 'Chamado criado - Tipo: bed, Prioridade: routine', '2026-03-18 10:58:19'),
('608369bc-226f-11f1-9b45-02420a000206', 'f1f6d833-1d64-4f16-b46c-e249c40dd0b8', 'created', NULL, 'Chamado criado - Tipo: hygiene, Prioridade: routine', '2026-03-18 02:08:38'),
('62012df1-22b9-11f1-903e-02420a000216', '92f50054-523d-42b3-afaa-e206387ac97c', 'created', NULL, 'Chamado criado - Tipo: pain, Prioridade: urgent', '2026-03-18 10:58:23'),
('629c20c9-226f-11f1-9b45-02420a000206', 'a60e9811-0c6d-45c0-8c4b-28dacfe0cb27', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 02:08:41'),
('64755064-226f-11f1-9b45-02420a000206', 'a60e9811-0c6d-45c0-8c4b-28dacfe0cb27', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 02:08:44'),
('6513b176-22b9-11f1-903e-02420a000216', '7eab0473-0aac-4715-bb1e-dba5f360d45e', 'created', NULL, 'Chamado criado - Tipo: hygiene, Prioridade: routine', '2026-03-18 10:58:28'),
('6646a8f4-226f-11f1-9b45-02420a000206', 'fa96a524-40da-43b7-af07-4a3fb0433b02', 'created', NULL, 'Chamado criado - Tipo: water, Prioridade: routine', '2026-03-18 02:08:47'),
('66ad0ebf-22b9-11f1-903e-02420a000216', '711b3d87-c9d7-43eb-9288-fb56ebf258b4', 'created', NULL, 'Chamado criado - Tipo: water, Prioridade: routine', '2026-03-18 10:58:31'),
('67bb34df-22b9-11f1-903e-02420a000216', '92f50054-523d-42b3-afaa-e206387ac97c', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 10:58:32'),
('686a9293-22c2-11f1-903e-02420a000216', 'b29db4af-157d-4a45-b178-322becd01f88', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 12:02:59'),
('68b9d2fa-22c2-11f1-903e-02420a000216', 'b29db4af-157d-4a45-b178-322becd01f88', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 12:03:00'),
('691d6d13-22c2-11f1-903e-02420a000216', 'c7ae3f63-ed73-475d-8259-02e309302a40', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 12:03:00'),
('6962d3df-22c2-11f1-903e-02420a000216', 'c7ae3f63-ed73-475d-8259-02e309302a40', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 12:03:01'),
('6985fcfc-22c2-11f1-903e-02420a000216', '341ff25e-2407-44ef-9c15-70c198d8813d', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 12:03:01'),
('69a7076d-22c2-11f1-903e-02420a000216', '341ff25e-2407-44ef-9c15-70c198d8813d', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 12:03:01'),
('69b3b3f8-226f-11f1-9b45-02420a000206', '66cd0488-5699-4960-96bd-dbaa3a56424f', 'created', NULL, 'Chamado criado - Tipo: bed, Prioridade: routine', '2026-03-18 02:08:53'),
('69df727c-22c2-11f1-903e-02420a000216', 'e8c4cddf-b4f4-4b74-ba77-52c450f694eb', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 12:03:02'),
('69fcaac6-22c2-11f1-903e-02420a000216', 'e8c4cddf-b4f4-4b74-ba77-52c450f694eb', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 12:03:02'),
('6a19fa0a-22c2-11f1-903e-02420a000216', '74bcb0a3-9c96-4dc7-9c06-2e25491c0d4c', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 12:03:02'),
('6a4bfe1a-22b9-11f1-903e-02420a000216', '92f50054-523d-42b3-afaa-e206387ac97c', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 10:58:37'),
('6acc2ca8-22b9-11f1-903e-02420a000216', 'e928e95f-af57-4466-bcf7-ece18af4a04f', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 10:58:38'),
('6af45a62-22c2-11f1-903e-02420a000216', '74bcb0a3-9c96-4dc7-9c06-2e25491c0d4c', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 12:03:03'),
('6b00c1ee-22b9-11f1-903e-02420a000216', 'e928e95f-af57-4466-bcf7-ece18af4a04f', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 10:58:38'),
('6b1e0503-22b9-11f1-903e-02420a000216', '7eab0473-0aac-4715-bb1e-dba5f360d45e', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 10:58:38'),
('6b4d7729-22b9-11f1-903e-02420a000216', '7eab0473-0aac-4715-bb1e-dba5f360d45e', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 10:58:38'),
('6b6fe6db-22b9-11f1-903e-02420a000216', '711b3d87-c9d7-43eb-9288-fb56ebf258b4', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 10:58:39'),
('6bb28239-22b9-11f1-903e-02420a000216', '711b3d87-c9d7-43eb-9288-fb56ebf258b4', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 10:58:39'),
('71c3bd1f-226e-11f1-9b45-02420a000206', '594004f0-3e1c-4a54-a805-d95509d475a4', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 02:01:57'),
('721accaf-226e-11f1-9b45-02420a000206', '594004f0-3e1c-4a54-a805-d95509d475a4', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 02:01:58'),
('73992e85-226f-11f1-9b45-02420a000206', 'fa96a524-40da-43b7-af07-4a3fb0433b02', 'seen', NULL, 'Status alterado de pending para seen', '2026-03-18 02:09:10'),
('746c7ed9-226f-11f1-9b45-02420a000206', 'fa96a524-40da-43b7-af07-4a3fb0433b02', 'attending', NULL, 'Status alterado de seen para attending', '2026-03-18 02:09:11'),
('74ed3c94-226f-11f1-9b45-02420a000206', 'fa96a524-40da-43b7-af07-4a3fb0433b02', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 02:09:12'),
('75c1d2e7-226f-11f1-9b45-02420a000206', '66cd0488-5699-4960-96bd-dbaa3a56424f', 'seen', NULL, 'Status alterado de pending para seen', '2026-03-18 02:09:13'),
('761b3a76-226f-11f1-9b45-02420a000206', '66cd0488-5699-4960-96bd-dbaa3a56424f', 'attending', NULL, 'Status alterado de seen para attending', '2026-03-18 02:09:14'),
('775c0da4-226f-11f1-9b45-02420a000206', '66cd0488-5699-4960-96bd-dbaa3a56424f', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 02:09:16'),
('7804627a-226f-11f1-9b45-02420a000206', 'f1f6d833-1d64-4f16-b46c-e249c40dd0b8', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 02:09:17'),
('79216b0a-226f-11f1-9b45-02420a000206', 'f1f6d833-1d64-4f16-b46c-e249c40dd0b8', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 02:09:19'),
('7a1189b8-226f-11f1-9b45-02420a000206', '02084bea-8b38-4d77-92d4-018e84b62fcb', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 02:09:20'),
('7ac8d91f-226f-11f1-9b45-02420a000206', '02084bea-8b38-4d77-92d4-018e84b62fcb', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 02:09:22'),
('8548b462-22bd-11f1-903e-02420a000216', 'e8c4cddf-b4f4-4b74-ba77-52c450f694eb', 'created', NULL, 'Chamado criado - Tipo: hygiene, Prioridade: routine', '2026-03-18 11:28:00'),
('85509fd0-22bd-11f1-903e-02420a000216', '341ff25e-2407-44ef-9c15-70c198d8813d', 'created', NULL, 'Chamado criado - Tipo: water, Prioridade: routine', '2026-03-18 11:28:00'),
('8550afcc-22bd-11f1-903e-02420a000216', 'c7ae3f63-ed73-475d-8259-02e309302a40', 'created', NULL, 'Chamado criado - Tipo: pain, Prioridade: urgent', '2026-03-18 11:28:00'),
('85907da6-22bd-11f1-903e-02420a000216', 'b29db4af-157d-4a45-b178-322becd01f88', 'created', NULL, 'Chamado criado - Tipo: emergency, Prioridade: emergency', '2026-03-18 11:28:01'),
('863c7337-22bd-11f1-903e-02420a000216', '74bcb0a3-9c96-4dc7-9c06-2e25491c0d4c', 'created', NULL, 'Chamado criado - Tipo: bed, Prioridade: routine', '2026-03-18 11:28:02'),
('873fbf23-2269-11f1-9b45-02420a000206', 'edee3124-bf2f-4f34-87da-2fbc9fea3022', 'attending', NULL, 'Status alterado de pending para attending', '2026-03-18 01:26:46'),
('87a13358-2269-11f1-9b45-02420a000206', 'edee3124-bf2f-4f34-87da-2fbc9fea3022', 'completed', NULL, 'Status alterado de attending para completed', '2026-03-18 01:26:46'),
('cc6d96f3-22bb-11f1-903e-02420a000216', 'bd8654ce-676c-4298-8b11-8d78b167a661', 'created', NULL, 'Chamado criado - Tipo: pain, Prioridade: urgent', '2026-03-18 11:15:40'),
('ebfe67cb-226e-11f1-9b45-02420a000206', '31467233-66d4-432c-96c4-5412d3caec89', 'created', NULL, 'Chamado criado - Tipo: emergency, Prioridade: emergency', '2026-03-18 02:05:22');

-- --------------------------------------------------------

--
-- Estrutura para tabela `call_types`
--

CREATE TABLE `call_types` (
  `id` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `priority` enum('emergency','urgent','routine') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `call_types`
--

INSERT INTO `call_types` (`id`, `code`, `name`, `priority`, `created_at`) VALUES
('type-bed', 'bed', 'Ajustar Leito', 'routine', '2026-03-18 01:20:36'),
('type-emergency', 'emergency', 'Emergência', 'emergency', '2026-03-18 01:20:36'),
('type-hygiene', 'hygiene', 'Higiene', 'routine', '2026-03-18 01:20:36'),
('type-pain', 'pain', 'Dor', 'urgent', '2026-03-18 01:20:36'),
('type-water', 'water', 'Água', 'routine', '2026-03-18 01:20:36');

-- --------------------------------------------------------

--
-- Estrutura para tabela `device_settings`
--

CREATE TABLE `device_settings` (
  `id` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL DEFAULT 'admin123',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `device_settings`
--

INSERT INTO `device_settings` (`id`, `password`, `updated_at`) VALUES
('default', '2026102030', '2026-03-18 11:09:21');

-- --------------------------------------------------------

--
-- Estrutura para tabela `refresh_settings`
--

CREATE TABLE `refresh_settings` (
  `id` varchar(36) NOT NULL DEFAULT 'default',
  `enabled` tinyint(1) DEFAULT 1,
  `interval_seconds` int(11) DEFAULT 30,
  `timezone` varchar(50) DEFAULT 'America/Sao_Paulo',
  `company_name` varchar(255) DEFAULT 'HOSPITAL SYSTEM',
  `logo_url` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `refresh_settings`
--

INSERT INTO `refresh_settings` (`id`, `enabled`, `interval_seconds`, `timezone`, `company_name`, `logo_url`, `updated_at`) VALUES
('default', 1, 10, 'America/Sao_Paulo', 'HOSPITAL SYSTEM', NULL, '2026-03-18 11:22:52');

-- --------------------------------------------------------

--
-- Estrutura para tabela `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `token`, `expires_at`, `created_at`) VALUES
('2e1c9a8d-dd12-4ce8-87ea-28ea4b0eb68d', '437cf962-cd28-4675-a59a-f3ae0d1e6237', 'c82da217-6999-47d9-9c96-3a501ddd4a72', '2026-03-19 13:11:44', '2026-03-18 10:11:44'),
('318455a3-afb3-4da3-a822-a075226db3e7', '437cf962-cd28-4675-a59a-f3ae0d1e6237', '0218fcfb-8621-4938-a08f-a9d70449b031', '2026-03-19 13:08:45', '2026-03-18 10:08:45'),
('44b6a950-1de0-4da4-af8f-d107066c12ab', '437cf962-cd28-4675-a59a-f3ae0d1e6237', 'a713483f-abe0-4033-a673-aa1ef1b55fc4', '2026-03-19 13:59:29', '2026-03-18 10:59:29'),
('6fc2d483-4a12-45dd-8ea9-b248917613dc', '437cf962-cd28-4675-a59a-f3ae0d1e6237', 'a9794607-399b-40e4-84d6-49c50475c473', '2026-03-19 13:37:05', '2026-03-18 10:37:05'),
('9c5c61fe-178e-48fc-b23a-f16eb10b30f9', '437cf962-cd28-4675-a59a-f3ae0d1e6237', 'ba5d9064-6fba-4977-8ac9-0ddd68fa0651', '2026-03-19 15:30:52', '2026-03-18 12:30:52'),
('d75a4684-0770-4605-a7c4-1682460bf376', '437cf962-cd28-4675-a59a-f3ae0d1e6237', '4f9daf42-b781-4e80-93da-c62a91f976be', '2026-03-19 14:00:29', '2026-03-18 11:00:29');

-- --------------------------------------------------------

--
-- Estrutura para tabela `sound_settings`
--

CREATE TABLE `sound_settings` (
  `id` varchar(36) NOT NULL DEFAULT 'default',
  `enabled` tinyint(1) DEFAULT 1,
  `volume` decimal(3,2) DEFAULT 0.80,
  `emergency_sound` enum('beep','alarm','chime','siren','bell','code_blue','pulse','high_alert') DEFAULT 'siren',
  `urgent_sound` enum('beep','alarm','chime','siren','bell','code_blue','pulse','high_alert') DEFAULT 'alarm',
  `routine_sound` enum('beep','alarm','chime','siren','bell','code_blue','pulse','high_alert') DEFAULT 'beep',
  `repeat_interval_seconds` int(11) DEFAULT 20,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `sound_settings`
--

INSERT INTO `sound_settings` (`id`, `enabled`, `volume`, `emergency_sound`, `urgent_sound`, `routine_sound`, `repeat_interval_seconds`, `updated_at`) VALUES
('default', 1, 0.80, 'high_alert', 'alarm', 'beep', 15, '2026-03-18 11:11:08');

-- --------------------------------------------------------

--
-- Estrutura para tabela `system_settings`
--

CREATE TABLE `system_settings` (
  `id` varchar(36) NOT NULL DEFAULT 'default',
  `company_name` varchar(255) DEFAULT 'Hospital System',
  `logo_url` varchar(255) DEFAULT NULL,
  `primary_color` varchar(50) DEFAULT '#0ea5e9',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `system_settings`
--

INSERT INTO `system_settings` (`id`, `company_name`, `logo_url`, `primary_color`, `updated_at`) VALUES
('default', 'Hospital System', NULL, '#0ea5e9', '2026-03-18 12:48:29');

-- --------------------------------------------------------

--
-- Estrutura stand-in para view `v_active_calls`
-- (Veja abaixo para a visão atual)
--
CREATE TABLE `v_active_calls` (
`id` varchar(36)
,`bed_number` varchar(20)
,`patient_name` varchar(255)
,`call_type` varchar(50)
,`priority` enum('emergency','urgent','routine')
,`status` enum('pending','seen','attending','completed')
,`ward` varchar(100)
,`created_at` timestamp
,`seen_at` timestamp
,`attending_at` timestamp
,`room` varchar(50)
,`waiting_seconds` bigint(21)
);

-- --------------------------------------------------------

--
-- Estrutura stand-in para view `v_beds_summary`
-- (Veja abaixo para a visão atual)
--
CREATE TABLE `v_beds_summary` (
`ward` varchar(100)
,`total_beds` bigint(21)
,`available` decimal(22,0)
,`occupied` decimal(22,0)
,`maintenance` decimal(22,0)
,`reserved` decimal(22,0)
);

-- --------------------------------------------------------

--
-- Estrutura stand-in para view `v_sla_by_ward`
-- (Veja abaixo para a visão atual)
--
CREATE TABLE `v_sla_by_ward` (
`ward` varchar(100)
,`total_calls` bigint(21)
,`avg_response_seconds` decimal(24,4)
,`min_response_seconds` bigint(21)
,`max_response_seconds` bigint(21)
);

-- --------------------------------------------------------

--
-- Estrutura para tabela `wards`
--

CREATE TABLE `wards` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `wards`
--

INSERT INTO `wards` (`id`, `name`, `description`, `created_at`) VALUES
('ward-emergencia', 'Emergência', 'Pronto Socorro', '2026-03-18 01:20:36'),
('ward-enfermaria', 'Enfermaria', 'Enfermaria Geral', '2026-03-18 01:20:36'),
('ward-maternidade', 'Maternidade', 'Ala de Maternidade', '2026-03-18 01:20:36'),
('ward-pediatria', 'Pediatria', 'Ala Pediátrica', '2026-03-18 01:20:36'),
('ward-uti', 'UTI', 'Unidade de Terapia Intensiva', '2026-03-18 01:20:36');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`);

--
-- Índices de tabela `beds`
--
ALTER TABLE `beds`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_bed_number` (`number`),
  ADD KEY `idx_ward` (`ward`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_beds_ward_status` (`ward`,`status`);

--
-- Índices de tabela `calls`
--
ALTER TABLE `calls`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_bed_number` (`bed_number`),
  ADD KEY `idx_ward` (`ward`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_status_priority` (`status`,`priority`),
  ADD KEY `bed_id` (`bed_id`),
  ADD KEY `call_type` (`call_type`),
  ADD KEY `idx_calls_composite` (`status`,`priority`,`created_at`);

--
-- Índices de tabela `call_history`
--
ALTER TABLE `call_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_call_id` (`call_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Índices de tabela `call_types`
--
ALTER TABLE `call_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Índices de tabela `device_settings`
--
ALTER TABLE `device_settings`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `refresh_settings`
--
ALTER TABLE `refresh_settings`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Índices de tabela `sound_settings`
--
ALTER TABLE `sound_settings`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `wards`
--
ALTER TABLE `wards`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

-- --------------------------------------------------------

--
-- Estrutura para view `v_active_calls`
--
DROP TABLE IF EXISTS `v_active_calls`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`%` SQL SECURITY DEFINER VIEW `v_active_calls`  AS SELECT `c`.`id` AS `id`, `c`.`bed_number` AS `bed_number`, `c`.`patient_name` AS `patient_name`, `c`.`call_type` AS `call_type`, `c`.`priority` AS `priority`, `c`.`status` AS `status`, `c`.`ward` AS `ward`, `c`.`created_at` AS `created_at`, `c`.`seen_at` AS `seen_at`, `c`.`attending_at` AS `attending_at`, `b`.`room` AS `room`, timestampdiff(SECOND,`c`.`created_at`,current_timestamp()) AS `waiting_seconds` FROM (`calls` `c` left join `beds` `b` on(`c`.`bed_id` = `b`.`id`)) WHERE `c`.`status` <> 'completed' ORDER BY field(`c`.`priority`,'emergency','urgent','routine') ASC, `c`.`created_at` ASC ;

-- --------------------------------------------------------

--
-- Estrutura para view `v_beds_summary`
--
DROP TABLE IF EXISTS `v_beds_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`%` SQL SECURITY DEFINER VIEW `v_beds_summary`  AS SELECT `beds`.`ward` AS `ward`, count(0) AS `total_beds`, sum(case when `beds`.`status` = 'available' then 1 else 0 end) AS `available`, sum(case when `beds`.`status` = 'occupied' then 1 else 0 end) AS `occupied`, sum(case when `beds`.`status` = 'maintenance' then 1 else 0 end) AS `maintenance`, sum(case when `beds`.`status` = 'reserved' then 1 else 0 end) AS `reserved` FROM `beds` GROUP BY `beds`.`ward` ;

-- --------------------------------------------------------

--
-- Estrutura para view `v_sla_by_ward`
--
DROP TABLE IF EXISTS `v_sla_by_ward`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`%` SQL SECURITY DEFINER VIEW `v_sla_by_ward`  AS SELECT `calls`.`ward` AS `ward`, count(0) AS `total_calls`, avg(timestampdiff(SECOND,`calls`.`created_at`,`calls`.`completed_at`)) AS `avg_response_seconds`, min(timestampdiff(SECOND,`calls`.`created_at`,`calls`.`completed_at`)) AS `min_response_seconds`, max(timestampdiff(SECOND,`calls`.`created_at`,`calls`.`completed_at`)) AS `max_response_seconds` FROM `calls` WHERE `calls`.`status` = 'completed' AND `calls`.`completed_at` is not null AND `calls`.`ward` is not null GROUP BY `calls`.`ward` ;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `beds`
--
ALTER TABLE `beds`
  ADD CONSTRAINT `beds_ibfk_1` FOREIGN KEY (`ward`) REFERENCES `wards` (`name`) ON UPDATE CASCADE;

--
-- Restrições para tabelas `calls`
--
ALTER TABLE `calls`
  ADD CONSTRAINT `calls_ibfk_1` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `calls_ibfk_2` FOREIGN KEY (`call_type`) REFERENCES `call_types` (`code`) ON UPDATE CASCADE;

--
-- Restrições para tabelas `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE;

DELIMITER $$
--
-- Eventos
--
CREATE DEFINER=`root`@`%` EVENT `ev_cleanup_sessions` ON SCHEDULE EVERY 1 HOUR STARTS '2026-03-18 09:48:30' ON COMPLETION NOT PRESERVE ENABLE DO CALL sp_cleanup_expired_sessions()$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
