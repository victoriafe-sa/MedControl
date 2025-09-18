package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLIntegrityConstraintViolationException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class UsuarioController {

    private final ObjectMapper mapper = new ObjectMapper();

    // ... (outros métodos como login, verificarEmail, etc., permanecem os mesmos)
        public void login(Context ctx) {
        String body = ctx.body();
        System.out.println("Recebido no /api/login: " + body);
        if (body == null || body.isEmpty()) {
            ctx.status(400).json(Map.of("success", false, "message", "Requisição inválida. Corpo vazio."));
            return;
        }
        try {
            Map<String, String> loginRequest = mapper.readValue(body, Map.class);
            String emailOuCpf = loginRequest.get("emailOuCpf");
            String senha = loginRequest.get("senha");

            String sql = "SELECT * FROM usuarios WHERE (email = ? OR cpf_cns = ?) AND senha = ? AND ativo = TRUE";
            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, emailOuCpf);
                ps.setString(2, emailOuCpf);
                ps.setString(3, senha);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        Map<String, Object> user = new HashMap<>();
                        user.put("id", rs.getInt("id"));
                        user.put("nome", rs.getString("nome"));
                        user.put("email", rs.getString("email"));
                        user.put("perfil", rs.getString("perfil"));
                        user.put("cpf_cns", rs.getString("cpf_cns"));
                        user.put("cep", rs.getString("cep"));
                        user.put("data_nascimento", rs.getString("data_nascimento"));
                        user.put("ativo", rs.getBoolean("ativo"));
                        ctx.json(Map.of("success", true, "user", user));
                    } else {
                        ctx.status(401).json(Map.of("success", false, "message", "Credenciais inválidas ou usuário inativo."));
                    }
                }
            }
        } catch (JsonProcessingException e) {
             ctx.status(400).json(Map.of("success", false, "message", "Formato de requisição inválido (JSON malformado)."));
        } catch (Exception e) {
            System.err.println("Erro no endpoint /api/login: " + e.getMessage());
            e.printStackTrace();
            ctx.status(500).json(Map.of("success", false, "message", "Erro interno no servidor."));
        }
    }


    public void registrar(Context ctx) {
        try {
            Map<String, String> user = mapper.readValue(ctx.body(), Map.class);
            String sql = "INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil) VALUES (?, ?, ?, ?, ?, ?, ?)";
            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, user.get("nome"));
                ps.setString(2, user.get("email"));
                ps.setString(3, user.get("cpf_cns"));
                ps.setString(4, user.get("cep"));
                
                String dataNascimento = user.get("data_nascimento");
                if (dataNascimento == null || dataNascimento.trim().isEmpty()) {
                    ps.setNull(5, Types.DATE);
                } else {
                    ps.setDate(5, Date.valueOf(dataNascimento));
                }

                ps.setString(6, user.get("senha"));
                ps.setString(7, "usuario");
                ps.executeUpdate();
                ctx.status(201).json(Map.of("success", true, "message", "Cadastro realizado com sucesso!"));
            }
        } catch (SQLIntegrityConstraintViolationException e) {
            String mensagemErro = e.getMessage().toLowerCase();
            String campo = "desconhecido";
            if (mensagemErro.contains("email")) {
                campo = "email";
            } else if (mensagemErro.contains("cpf_cns")) {
                campo = "cpf_cns";
            }
            ctx.status(409).json(Map.of("success", false, "message", "Valor já cadastrado.", "field", campo));
        } catch(Exception e) {
             System.err.println("Erro no endpoint /api/register: " + e.getMessage());
             e.printStackTrace();
             ctx.status(500).json(Map.of("success", false, "message", "Erro interno ao processar o cadastro."));
        }
    }
        public void verificarEmail(Context ctx) {
        try (Connection conn = DB.getConnection()) {
            Map<String, String> req = mapper.readValue(ctx.body(), Map.class);
            String email = req.get("email");
            String sql = "SELECT EXISTS (SELECT 1 FROM usuarios WHERE email = ?)";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, email);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next() && rs.getBoolean(1)) {
                        ctx.json(Map.of("exists", true));
                    } else {
                        ctx.json(Map.of("exists", false));
                    }
                }
            }
        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", "Erro no servidor"));
        }
    }

    public void atualizarSenha(Context ctx) {
        try (Connection conn = DB.getConnection()) {
            Map<String, String> req = mapper.readValue(ctx.body(), Map.class);
            String email = req.get("email");
            String newPassword = req.get("newPassword");
            String sql = "UPDATE usuarios SET senha = ? WHERE email = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, newPassword);
                ps.setString(2, email);
                int updatedRows = ps.executeUpdate();
                if (updatedRows > 0) {
                    ctx.json(Map.of("success", true));
                } else {
                    ctx.status(404).json(Map.of("success", false, "message", "Email não encontrado."));
                }
            }
        } catch (Exception e) {
            ctx.status(500).json(Map.of("success", false, "message", "Erro ao atualizar a senha."));
        }
    }

    public void listarTodos(Context ctx) {
        List<Map<String, Object>> userList = new ArrayList<>();
        String sql = "SELECT * FROM usuarios ORDER BY nome";
        try (Connection conn = DB.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> user = new HashMap<>();
                user.put("id", rs.getInt("id"));
                user.put("nome", rs.getString("nome"));
                user.put("email", rs.getString("email"));
                user.put("cpf_cns", rs.getString("cpf_cns"));
                user.put("cep", rs.getString("cep"));
                Date dataNascimento = rs.getDate("data_nascimento");
                user.put("data_nascimento", dataNascimento != null ? dataNascimento.toString() : null);
                user.put("perfil", rs.getString("perfil"));
                user.put("ativo", rs.getBoolean("ativo"));
                userList.add(user);
            }
            ctx.json(userList);
        } catch (Exception e) {
            System.err.println("Erro ao buscar usuários: " + e.getMessage());
            ctx.status(500).json(Map.of("error", "Erro ao buscar usuários"));
        }
    }

    public void criar(Context ctx) {
        try {
            Map<String, String> user = mapper.readValue(ctx.body(), Map.class);
            String sql = "INSERT INTO usuarios (nome, email, cpf_cns, cep, data_nascimento, senha, perfil) VALUES (?, ?, ?, ?, ?, ?, ?)";
            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, user.get("nome"));
                ps.setString(2, user.get("email"));
                ps.setString(3, user.get("cpf_cns"));
                ps.setString(4, user.get("cep"));
                
                String dataNascimento = user.get("data_nascimento");
                if (dataNascimento == null || dataNascimento.trim().isEmpty()) {
                    ps.setNull(5, Types.DATE);
                } else {
                    ps.setDate(5, Date.valueOf(dataNascimento));
                }
                
                ps.setString(6, user.get("senha"));
                ps.setString(7, user.get("perfil"));
                ps.executeUpdate();
                ctx.status(201).json(Map.of("success", true));
            }
        } catch (SQLIntegrityConstraintViolationException e) {
            String mensagemErro = e.getMessage().toLowerCase();
            String campo = "desconhecido";
            if (mensagemErro.contains("email")) {
                campo = "email";
            } else if (mensagemErro.contains("cpf_cns")) {
                campo = "cpf_cns";
            }
            ctx.status(409).json(Map.of("success", false, "message", "Valor já cadastrado.", "field", campo));
        } catch (Exception e) {
            System.err.println("Erro no endpoint /api/users (criar): " + e.getMessage());
            e.printStackTrace();
            ctx.status(500).json(Map.of("success", false, "message", "Erro ao adicionar usuário."));
        }
    }

    public void atualizar(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Map<String, String> user = mapper.readValue(ctx.body(), Map.class);
            
            // Lógica para verificar duplicidade antes de atualizar
            String checkSql = "SELECT id FROM usuarios WHERE (email = ? OR cpf_cns = ?) AND id != ?";
            try (Connection conn = DB.getConnection();
                 PreparedStatement checkPs = conn.prepareStatement(checkSql)) {
                checkPs.setString(1, user.get("email"));
                checkPs.setString(2, user.get("cpf_cns"));
                checkPs.setInt(3, id);
                try (ResultSet rs = checkPs.executeQuery()) {
                    if (rs.next()) {
                        // Se encontrou um usuário, verifica qual campo está duplicado
                        Map<String, String> userForCheck = new HashMap<>();
                        userForCheck.put("email", user.get("email"));
                        userForCheck.put("cpf_cns", user.get("cpf_cns"));
                        for(Map.Entry<String, String> entry : userForCheck.entrySet()){
                            String checkFieldSql = "SELECT id FROM usuarios WHERE " + entry.getKey() + " = ? AND id != ?";
                             try (PreparedStatement ps = conn.prepareStatement(checkFieldSql)) {
                                ps.setString(1, entry.getValue());
                                ps.setInt(2, id);
                                try (ResultSet rsField = ps.executeQuery()) {
                                    if (rsField.next()) {
                                        ctx.status(409).json(Map.of("success", false, "message", "Valor já cadastrado.", "field", entry.getKey()));
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }


            String sql = "UPDATE usuarios SET nome = ?, email = ?, cpf_cns = ?, cep = ?, data_nascimento = ?, perfil = ? WHERE id = ?";
            if (user.get("perfil") == null) { // Se for um usuário editando o próprio perfil
                sql = "UPDATE usuarios SET nome = ?, email = ?, cpf_cns = ?, cep = ?, data_nascimento = ? WHERE id = ?";
            }


            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, user.get("nome"));
                ps.setString(2, user.get("email"));
                ps.setString(3, user.get("cpf_cns"));
                ps.setString(4, user.get("cep"));
                
                String dataNascimento = user.get("data_nascimento");
                if (dataNascimento == null || dataNascimento.trim().isEmpty() || dataNascimento.equals("null")) {
                    ps.setNull(5, Types.DATE);
                } else {
                    ps.setDate(5, Date.valueOf(dataNascimento));
                }
                
                if (user.get("perfil") != null) {
                    ps.setString(6, user.get("perfil"));
                    ps.setInt(7, id);
                } else {
                    ps.setInt(6, id);
                }

                ps.executeUpdate();
                ctx.json(Map.of("success", true));
            }
        } catch (SQLIntegrityConstraintViolationException e) {
            // Este catch é um fallback, a verificação manual acima é mais específica
            String mensagemErro = e.getMessage().toLowerCase();
            String campo = "desconhecido";
            if (mensagemErro.contains("email")) {
                campo = "email";
            } else if (mensagemErro.contains("cpf_cns")) {
                campo = "cpf_cns";
            }
            ctx.status(409).json(Map.of("success", false, "message", "Valor já cadastrado.", "field", campo));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("success", false, "message", "Erro ao atualizar usuário."));
        }
    }


    public void alterarStatus(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Map<String, Boolean> status = mapper.readValue(ctx.body(), Map.class);
            String sql = "UPDATE usuarios SET ativo = ? WHERE id = ?";
             try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setBoolean(1, status.get("ativo"));
                ps.setInt(2, id);
                ps.executeUpdate();
                ctx.json(Map.of("success", true));
            }
        } catch (Exception e) {
            ctx.status(500).json(Map.of("success", false, "message", "Erro ao alterar status do usuário."));
        }
    }

    public void excluir(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            String sql = "DELETE FROM usuarios WHERE id = ?";
            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, id);
                ps.executeUpdate();
                ctx.json(Map.of("success", true));
            }
        } catch (Exception e) {
            ctx.status(500).json(Map.of("success", false, "message", "Erro ao excluir usuário."));
        }
    }

    public void verificarSenhaAdmin(Context ctx) {
        try {
            Map<String, Object> req = mapper.readValue(ctx.body(), Map.class);
            Integer adminId = (Integer) req.get("adminId");
            String password = (String) req.get("password");

            if (adminId == null || password == null) {
                ctx.status(400).json(Map.of("success", false, "message", "ID do admin e senha são obrigatórios."));
                return;
            }

            String sql = "SELECT EXISTS (SELECT 1 FROM usuarios WHERE id = ? AND senha = ? AND perfil = 'admin')";
            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, adminId);
                ps.setString(2, password);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next() && rs.getBoolean(1)) {
                        ctx.json(Map.of("success", true));
                    } else {
                        ctx.status(401).json(Map.of("success", false, "message", "Senha de administrador incorreta."));
                    }
                }
            }
        } catch (Exception e) {
             System.err.println("Erro na verificação de senha do admin: " + e.getMessage());
             e.printStackTrace();
             ctx.status(500).json(Map.of("success", false, "message", "Erro interno no servidor."));
        }
    }
}
