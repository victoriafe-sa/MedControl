-- Exclui o banco de dados se ele já existir, para garantir uma instalação limpa.
DROP DATABASE IF EXISTS medcontrol_db;

-- Cria o banco de dados.
CREATE DATABASE medcontrol_db;

-- Seleciona o banco de dados recém-criado para os comandos seguintes.
USE medcontrol_db;

-- Tabela de Usuários
-- Armazena todos os usuários do sistema, incluindo cidadãos, farmacêuticos e administradores.
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf_cns VARCHAR(20) NOT NULL UNIQUE,
    cep VARCHAR(10),
    logradouro VARCHAR(255) NULL,
    bairro VARCHAR(100) NULL,
    cidade VARCHAR(100) NULL,
    uf CHAR(2) NULL,
    data_nascimento DATE,
    senha VARCHAR(255) NOT NULL,
    perfil ENUM('usuario', 'farmaceutico', 'admin', 'gestor_ubs', 'gestor_estoque') NOT NULL DEFAULT 'usuario',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RF03: Manter Cadastro UBS
-- ============================================
CREATE TABLE ubs (
    id_ubs INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    endereco TEXT NOT NULL,
    cep VARCHAR(10) NULL,
    telefone VARCHAR(20),
    horario_funcionamento VARCHAR(255), -- Para [RF03.2]
    latitude DECIMAL(10, 8), -- Para [RF06.2]
    longitude DECIMAL(11, 8), -- Para [RF06.2]
    ativo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- RF04 – Manter Cadastro de Medicamentos
-- ============================================
CREATE TABLE medicamentos (
    id_medicamento INT AUTO_INCREMENT PRIMARY KEY,
    nome_comercial VARCHAR(150) NOT NULL,
    principio_ativo VARCHAR(150) NOT NULL,
    concentracao VARCHAR(50),
    apresentacao VARCHAR(100),
    via_administracao VARCHAR(50),
    controlado BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE estoque (
    id_estoque INT AUTO_INCREMENT PRIMARY KEY,
    id_ubs INT NOT NULL,
    id_medicamento INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    lote VARCHAR(50), -- Para [RF04.2]
    data_validade DATE, -- Para [RF04.2] e [RF09.1]
    ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ubs) REFERENCES ubs(id_ubs),
    FOREIGN KEY (id_medicamento) REFERENCES medicamentos(id_medicamento),
    UNIQUE KEY uk_medicamento_ubs_lote (id_ubs, id_medicamento, lote) -- Garante unicidade por lote
);

-- ============================================
-- 4. FARMACÊUTICOS (PRESCRITORES) E RECEITAS
-- ============================================
CREATE TABLE farmaceuticos (
    id_farmaceutico INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    crf VARCHAR(20) NOT NULL UNIQUE, -- Conselho Regional de Farmácia
    especialidade VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE receitas (
    id_receita INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL, -- Paciente
    id_farmaceutico_prescritor INT NOT NULL, -- Profissional que prescreveu
    codigo_receita VARCHAR(50) NOT NULL UNIQUE, -- Para [RF05.5] e [RF08.3]
    data_emissao DATE NOT NULL,
    data_validade DATE NOT NULL,
    autenticada BOOLEAN DEFAULT FALSE,
    utilizada BOOLEAN DEFAULT FALSE, -- Para [RF08.3] (Prevenir duplicidade)
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_farmaceutico_prescritor) REFERENCES farmaceuticos(id_farmaceutico)
);

CREATE TABLE itens_receitas (
    id_item INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    id_medicamento INT NOT NULL,
    quantidade INT NOT NULL,
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita) ON DELETE CASCADE,
    FOREIGN KEY (id_medicamento) REFERENCES medicamentos(id_medicamento)
);

-- ============================================
-- RF08.4: Auditoria de Ações (NOVA TABELA)
-- ============================================
CREATE TABLE auditoria (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL, -- ID do admin que fez a ação (pode ser nulo se não implementada autenticação de admin)
    acao VARCHAR(255) NOT NULL, -- Ex: 'CRIAR', 'ATUALIZAR', 'EXCLUIR'
    tabela_afetada VARCHAR(100) NOT NULL, -- Ex: 'usuarios', 'ubs'
    registro_id INT NOT NULL, -- ID do registro afetado (ex: id_usuario, id_ubs)
    detalhes TEXT NULL, -- JSON com os dados alterados
    data_log DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE SET NULL
);


--- DADOS INICIAIS (PARA TESTES) ---
--- RF01 / RF02

-- Inserir um dos administradores
-- A senha é 'admin123' criptografada com Spring Security BCrypt.
-- MODIFICAÇÃO 1.2: Removido latitude/longitude e adicionado campos de endereço
INSERT INTO usuarios (nome, email, cpf_cns, cep, logradouro, bairro, cidade, uf, data_nascimento, senha, perfil, ativo) VALUES
('Admin', 'admin@medcontrol.com', '00000000000', '71000-000', NULL, NULL, NULL, NULL, '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'admin', TRUE),
('Farmaceutico', 'farmaceutico@medcontrol.com', '00000001000', '71000-000', NULL, NULL, NULL, NULL, '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'farmaceutico', TRUE),
('Gestor UBS', 'gestorubs@medcontrol.com', '00000007000', '71000-000', NULL, NULL, NULL, NULL, '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'gestor_ubs', TRUE),
('Gestor Estoque', 'gestorestoque@medcontrol.com', '00000000080', '71000-000', NULL, NULL, NULL, NULL, '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'gestor_estoque', TRUE),
-- Inserir um usuário comum
-- A senha é 'usuario123' criptografada com Spring Security BCrypt.
('Usuario de Teste', 'usuario@teste.com', '11122233344', '72000-000', NULL, NULL, NULL, NULL, '1995-05-15', '$2a$10$lWCdpXkPNggpxo/9HJ5NxO/hiXllbNkA.A9gH1qPdtvjjcquKE4o2', 'usuario', TRUE),
-- Inserir um usuário inativo para teste
-- A senha é 'inativo123' criptografada com Spring Security BCrypt.
('Usuario Inativo', 'inativo@teste.com', '55566677788', '73000-000', NULL, NULL, NULL, NULL, '1998-10-20', '$2a$10$IA7JfO3cNAoIwRag9BqdqecaGtTkV/FyLbucE1pGd305IdjfwlxTa', 'usuario', FALSE);


--- DADOS INICIAIS (PARA TESTES) ---
--- RF03 / RF04

-- Inserir 3 UBS de teste (RF03)

INSERT INTO ubs (nome, endereco, cep, telefone, horario_funcionamento, latitude, longitude, ativo) VALUES
('UBS 01 Asa Sul', 'Quadra 614 Sul, Brasília - DF', '70200-740', '(61) 3345-0001', 'Seg-Sex 07:00-19:00', -15.823930, -47.906960, TRUE),
('UBS 02 Taguatinga Centro', 'QNC AE 1, Taguatinga - DF', '72115-515', '(61) 3352-0002', 'Seg-Sex 07:00-18:00', -15.834580, -48.056960, TRUE),
('UBS 03 Guará II', 'QE 23, Guará II - DF', '71050-230', '(61) 3381-0003', 'Seg-Sex 08:00-17:00', -15.817630, -47.988160, TRUE);

INSERT INTO medicamentos (nome_comercial, principio_ativo, concentracao, apresentacao, via_administracao, controlado, ativo) VALUES
('Dipirona 500mg', 'Dipirona Monoidratada', '500mg', 'Comprimido', 'Oral', FALSE, TRUE),
('Omeprazol 20mg', 'Omeprazol', '20mg', 'Cápsula', 'Oral', FALSE, TRUE),
('Sinvastatina 20mg', 'Sinvastatina', '20mg', 'Comprimido', 'Oral', FALSE, TRUE),
('Metformina 850mg', 'Cloridrato de Metformina', '850mg', 'Comprimido', 'Oral', FALSE, TRUE),
('Atenolol 25mg', 'Atenolol', '25mg', 'Comprimido', 'Oral', FALSE, TRUE),
('Captopril 25mg', 'Captopril', '25mg', 'Comprimido', 'Oral', FALSE, TRUE),
('Hidroclorotiazida 25mg', 'Hidroclorotiazida', '25mg', 'Comprimido', 'Oral', FALSE, TRUE),
('Azitromicina 500mg', 'Azitromicina Di-hidratada', '500mg', 'Comprimido', 'Oral', TRUE, TRUE),
('Salbutamol 100mcg', 'Sulfato de Salbutamol', '100mcg/dose', 'Spray Inalatório', 'Inalatório', FALSE, TRUE),
('Insulina NPH', 'Insulina Humana NPH', '100 UI/mL', 'Suspensão Injetável', 'Subcutâneo', TRUE, TRUE);

INSERT INTO estoque (id_ubs, id_medicamento, quantidade, lote, data_validade) VALUES
-- UBS 01 Asa Sul (ID 1)
(1, 1, 200, 'DP1-001', '2027-10-01'), -- Dipirona
(1, 2, 300, 'OM1-001', '2026-08-01'), -- Omeprazol
(1, 5, 80, 'AT1-001', '2026-11-01'),  -- Atenolol
(1, 8, 50, 'AZ1-001', '2026-12-01'),  -- Azitromicina

-- UBS 02 Taguatinga Centro (ID 2)
(2, 1, 150, 'DP2-002', '2027-10-01'), -- Dipirona
(2, 4, 250, 'MT2-001', '2028-01-01'), -- Metformina
(2, 6, 100, 'CP2-001', '2027-05-01'), -- Captopril
(2, 10, 75, 'IN2-001', '2025-12-01'), -- Insulina NPH

-- UBS 03 Guará II (ID 3)
(3, 3, 120, 'SV3-001', '2027-01-15'), -- Sinvastatina
(3, 7, 130, 'HD3-001', '2027-07-01'); -- Hidroclorotiazida