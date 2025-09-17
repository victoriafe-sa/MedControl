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
    perfil ENUM('usuario', 'farmaceutico', 'admin', 'gestor_ubs') NOT NULL DEFAULT 'usuario',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- DADOS INICIAIS (PARA TESTES) ---

-- Inserir um administrador principal
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Admin Principal', 'admin@medcontrol.com', '00000000000', '71000-000', '1990-01-01', 'admin123', 'admin', TRUE);


-- Inserir um usuário comum
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Usuario de Teste', 'usuario@teste.com', '11122233344', '72000-000', '1995-05-15', 'usuario123', 'usuario', TRUE);

-- Inserir um usuário inativo para teste
INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil, ativo) VALUES
('Usuario Inativo', 'inativo@teste.com', '55566677788', '73000-000', '1998-10-20', 'inativo123', 'usuario', FALSE);

