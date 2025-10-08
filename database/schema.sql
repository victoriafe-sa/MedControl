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
    data_nascimento DATE,
    senha VARCHAR(255) NOT NULL,
    perfil ENUM('usuario', 'farmaceutico', 'admin', 'gestor_ubs', 'gestor_estoque') NOT NULL DEFAULT 'usuario',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- DADOS INICIAIS (PARA TESTES) ---

-- Inserir um dos administradores
-- A senha é 'admin123' criptografada com Spring Security BCrypt.
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Admin', 'admin@medcontrol.com', '00000000000', '71000-000', '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'admin', TRUE);
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Farmaceutico', 'farmaceutico@medcontrol.com', '00000001000', '71000-000', '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'farmaceutico', TRUE);
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Gestor UBS', 'gestorubs@medcontrol.com', '00000007000', '71000-000', '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'gestor_ubs', TRUE);
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Gestor Estoque', 'gestorestoque@medcontrol.com', '00000000080', '71000-000', '1990-01-01', '$2a$10$9DXdZTm1mffqQsXJSmFHXeypWBtLlVQHCDLqCFLH42feS4v0MYatO', 'gestor_estoque', TRUE);


-- Inserir um usuário comum
-- A senha é 'usuario123' criptografada com Spring Security BCrypt.
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Usuario de Teste', 'usuario@teste.com', '11122233344', '72000-000', '1995-05-15', '$2a$10$lWCdpXkPNggpxo/9HJ5NxO/hiXllbNkA.A9gH1qPdtvjjcquKE4o2', 'usuario', TRUE);

-- Inserir um usuário inativo para teste
-- A senha é 'inativo123' criptografada com Spring Security BCrypt.
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Usuario Inativo', 'inativo@teste.com', '55566677788', '73000-000', '1998-10-20', '$2a$10$IA7JfO3cNAoIwRag9BqdqecaGtTkV/FyLbucE1pGd305IdjfwlxTa', 'usuario', FALSE);