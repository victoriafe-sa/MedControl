package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import com.fasterxml.jackson.core.type.TypeReference; // IMPORT ADICIONADO
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLIntegrityConstraintViolationException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class UsuarioController {

    private final ObjectMapper mapper = new ObjectMapper();
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    
    // Método estático para ser chamado por outros controladores
    public static void internalUpdate(int id, Map<String, String> user) throws SQLException, SQLIntegrityConstraintViolationException {
        String sql = "UPDATE usuarios SET nome = ?, email = ?, cpf_cns = ?, cep = ?, data_nascimento = ?, perfil = ? WHERE id = ?";
        if (user.get("perfil") == null) {
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
        }
    }


    public void redefinirSenha(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            // MODIFICADO: Uso de TypeReference para segurança de tipos.
            Map<String, String> req = mapper.readValue(ctx.body(), new TypeReference<Map<String, String>>() {});
            String senhaAtual = req.get("senhaAtual");
            String novaSenha = req.get("novaSenha");

            String sqlSelect = "SELECT senha FROM usuarios WHERE id = ?";
            try (Connection conn = DB.getConnection();
                 PreparedStatement psSelect = conn.prepareStatement(sqlSelect)) {
                
                psSelect.setInt(1, id);
                try (ResultSet rs = psSelect.executeQuery()) {
                    if (rs.next()) {
                        String senhaHash = rs.getString("senha");
                        if (passwordEncoder.matches(senhaAtual, senhaHash)) {
                            String novaSenhaHash = passwordEncoder.encode(novaSenha);
                            String sqlUpdate = "UPDATE usuarios SET senha = ? WHERE id = ?";
                            try (PreparedStatement psUpdate = conn.prepareStatement(sqlUpdate)) {
                                psUpdate.setString(1, novaSenhaHash);
                                psUpdate.setInt(2, id);
                                psUpdate.executeUpdate();
                                ctx.json(Map.of("success", true));
                            }
                        } else {
                            ctx.status(401).json(Map.of("success", false, "message", "A senha atual está incorreta."));
                        }
                    } else {
                        ctx.status(404).json(Map.of("success", false, "message", "Usuário não encontrado."));
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("success", false, "message", "Erro interno ao redefinir a senha."));
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

    public void atualizar(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            // MODIFICADO: Uso de TypeReference para segurança de tipos.
            Map<String, String> user = mapper.readValue(ctx.body(), new TypeReference<Map<String, String>>() {});
            internalUpdate(id, user);
            ctx.json(Map.of("success", true));
        } catch (SQLIntegrityConstraintViolationException e) {
            String campo = e.getMessage().toLowerCase().contains("email") ? "email" : "cpf_cns";
            ctx.status(409).json(Map.of("success", false, "message", "Valor já cadastrado.", "field", campo));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("success", false, "message", "Erro ao atualizar usuário."));
        }
    }


    public void alterarStatus(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            // MODIFICADO: Uso de TypeReference para segurança de tipos.
            Map<String, Boolean> status = mapper.readValue(ctx.body(), new TypeReference<Map<String, Boolean>>() {});
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
            Map<String, Object> req = mapper.readValue(ctx.body(), new TypeReference<Map<String, Object>>() {});
            Integer userId = (Integer) req.get("adminId"); // O nome da chave é 'adminId', mas representa o id do usuário logado
            String password = (String) req.get("password");

            if (userId == null || password == null) {
                ctx.status(400).json(Map.of("success", false, "message", "ID do usuário e senha são obrigatórios."));
                return;
            }

            // CORREÇÃO: Remove a cláusula "AND perfil = 'admin'" para permitir que qualquer usuário
            // do painel de gerenciamento confirme sua própria senha.
            String sql = "SELECT senha FROM usuarios WHERE id = ?";
            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        String senhaHash = rs.getString("senha");
                        if (passwordEncoder.matches(password, senhaHash)) {
                            ctx.json(Map.of("success", true));
                        } else {
                            ctx.status(401).json(Map.of("success", false, "message", "Senha incorreta."));
                        }
                    } else {
                        // A mensagem de erro foi generalizada para "Usuário não encontrado".
                        ctx.status(404).json(Map.of("success", false, "message", "Usuário não encontrado."));
                    }
                }
            }
        } catch (Exception e) {
             System.err.println("Erro na verificação de senha: " + e.getMessage());
             e.printStackTrace();
             ctx.status(500).json(Map.of("success", false, "message", "Erro interno no servidor."));
        }
    }
}
