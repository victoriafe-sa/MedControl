-- ============================================
-- BANCO DE DADOS - SISTEMA DE GESTÃO DE MEDICAMENTOS (SUS)
-- ============================================


CREATE DATABASE medcontrol;
USE medcontrol;

-- ============================================
-- 1. PERFIS E USUÁRIOS
-- ============================================
CREATE TABLE perfis (
    id_perfil INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL
);

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf_cns VARCHAR(20) NOT NULL UNIQUE,
    cep VARCHAR(10),
    data_nascimento DATE,
    senha VARCHAR(255) NOT NULL,
    perfil ENUM('usuario', 'farmaceutico', 'admin', 'gestor_ubs') NOT NULL DEFAULT 'usuario',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_perfil) REFERENCES perfis(id_perfil)
);

CREATE TABLE validacao_email (
    id_validacao INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    validado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ============================================
-- 2. UBS (Unidades Básicas de Saúde)
-- ============================================
CREATE TABLE ubs (
    id_ubs INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    endereco TEXT NOT NULL,
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 3. MEDICAMENTOS E ESTOQUE
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
    quantidade INT DEFAULT 0,
    FOREIGN KEY (id_ubs) REFERENCES ubs(id_ubs),
    FOREIGN KEY (id_medicamento) REFERENCES medicamentos(id_medicamento)
);

-- ============================================
-- 4. MÉDICOS E RECEITAS
-- ============================================
CREATE TABLE medicos (
    id_medico INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    crm VARCHAR(20) UNIQUE NOT NULL,
    especialidade VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE receitas (
    id_receita INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_medico INT NOT NULL,
    data_emissao DATE NOT NULL,
    validade DATE NOT NULL,
    autenticada BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_medico) REFERENCES medicos(id_medico)
);

CREATE TABLE itens_receita (
    id_item INT AUTO_INCREMENT PRIMARY KEY,
    id_receita INT NOT NULL,
    id_medicamento INT NOT NULL,
    quantidade INT NOT NULL,
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita),
    FOREIGN KEY (id_medicamento) REFERENCES medicamentos(id_medicamento)
);

-- ============================================
-- 5. RESERVAS E AGENDAMENTOS
-- ============================================
CREATE TABLE reservas (
    id_reserva INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_medicamento INT NOT NULL,
    id_ubs INT NOT NULL,
    data_reserva DATE NOT NULL,
    horario TIME NOT NULL,
    status ENUM('Ativa', 'Cancelada', 'Concluída') DEFAULT 'Ativa',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_medicamento) REFERENCES medicamentos(id_medicamento),
    FOREIGN KEY (id_ubs) REFERENCES ubs(id_ubs)
);

-- ============================================
-- 6. RETIRADAS E PREVENÇÃO DE FRAUDES
-- ============================================
CREATE TABLE retiradas (
    id_retirada INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_medicamento INT NOT NULL,
    id_receita INT NOT NULL,
    id_ubs INT NOT NULL,
    data_retirada DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_medicamento) REFERENCES medicamentos(id_medicamento),
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita),
    FOREIGN KEY (id_ubs) REFERENCES ubs(id_ubs)
);

CREATE TABLE logs_fraudes (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo VARCHAR(100), -- "Carteirinha inválida", "Receita inválida", "Retirada duplicada"
    descricao TEXT,
    data_log DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ============================================
-- 7. RELATÓRIOS E AUDITORIA
-- ============================================
CREATE TABLE auditoria (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    acao VARCHAR(255) NOT NULL,
    tabela_afetada VARCHAR(100),
    registro_id INT,
    data_acao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ============================================
-- POPULAR PERFIS BÁSICOS
-- ============================================
INSERT INTO perfis (nome) VALUES 
('Administrador'),
('Gestor UBS'),
('Gestor Estoque'),
('Médico'),
('Usuário');
