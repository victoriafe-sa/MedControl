-- Exclui o banco de dados se ele já existir, para garantir uma instalação limpa.
DROP DATABASE IF EXISTS medcontrol_db;

-- Cria o banco de dados.
CREATE DATABASE medcontrol_db;

-- Seleciona o banco de dados recém-criado para os comandos seguintes.
USE medcontrol_db;

-- ============================================
-- RF01 E RF02: GESTÃO LOGIN/CADASTRO USUÁRIOS E PERFIS
-- ============================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf_cns VARCHAR(20) NOT NULL UNIQUE,
    cep VARCHAR(10),
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
-- (Substituindo 'Medicos' conforme solicitado)
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
-- 5. RESERVAS E AGENDAMENTOS
-- ============================================
CREATE TABLE reservas (
    id_reserva INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_medicamento INT NOT NULL,
    id_ubs INT NOT NULL,
    data_hora_reserva DATETIME NOT NULL, -- Para [RF07.1]
    quantidade_reservada INT NOT NULL,
    status ENUM('AGENDADA', 'CANCELADA', 'RETIRADA', 'EXPIRADA') NOT NULL DEFAULT 'AGENDADA',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_medicamento) REFERENCES medicamentos(id_medicamento),
    FOREIGN KEY (id_ubs) REFERENCES ubs(id_ubs)
);

-- ============================================
-- 6. RETIRADAS E PREVENÇÃO DE FRAUDES
-- ============================================
CREATE TABLE retiradas (
    id_retirada INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL, -- Paciente
    id_medicamento INT NOT NULL,
    id_receita INT NOT NULL,
    id_ubs INT NOT NULL,
    id_farmaceutico_dispensador INT NOT NULL, -- Usuário (perfil 'farmaceutico') que dispensou
    quantidade_retirada INT NOT NULL,
    data_retirada DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_medicamento) REFERENCES medicamentos(id_medicamento),
    FOREIGN KEY (id_receita) REFERENCES receitas(id_receita),
    FOREIGN KEY (id_ubs) REFERENCES ubs(id_ubs),
    FOREIGN KEY (id_farmaceutico_dispensador) REFERENCES usuarios(id)
);

CREATE TABLE logs_fraudes (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL, -- Pode não haver usuário logado na tentativa
    tipo VARCHAR(100), -- "Carteirinha inválida", "Receita inválida", "Retirada duplicada"
    descricao TEXT,
    data_log DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE SET NULL
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
    detalhes TEXT, -- Armazena JSON com valor antigo/novo
    data_acao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

-- ============================================
-- --- DADOS INICIAIS (PARA TESTES) ---
-- (Baseado no seu script original)
-- ============================================

-- Inserir um dos administradores (senha 'admin123')
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Admin', 'admin@medcontrol.com', '00000000000', '71000-000', '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'admin', TRUE);

-- Inserir um farmacêutico (dispensador/operador) (senha 'admin123')
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Farmaceutico Operador', 'farmaceutico@medcontrol.com', '00000001000', '71000-000', '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'farmaceutico', TRUE);

-- Inserir Gestores (senha 'admin123')
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Gestor UBS', 'gestorubs@medcontrol.com', '00000007000', '71000-000', '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'gestor_ubs', TRUE);
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Gestor Estoque', 'gestorestoque@medcontrol.com', '00000000080', '71000-000', '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'gestor_estoque', TRUE);

-- Inserir um usuário comum (senha 'usuario123')
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Usuario de Teste', 'usuario@teste.com', '11122233344', '72000-000', '1995-05-15', '$2a$10$lWCdpXkPNggpxo/9HJ5NxO/hiXllbNkA.A9gH1qPdtvjjcquKE4o2', 'usuario', TRUE);

-- Inserir um usuário inativo (senha 'inativo123')
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Usuario Inativo', 'inativo@teste.com', '55566677788', '73000-000', '1998-10-20', '$2a$10$IA7JfO3cNAoIwRag9BqdqecaGtTkV/FyLbucE1pGd305IdjfwlxTa', 'usuario', FALSE);