package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import br.com.medcontrol.servicos.EmailServico;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.http.Context;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLIntegrityConstraintViolationException;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class AutenticacaoController {

    private static class CodigoInfo {
        String codigo;
        LocalDateTime expiracao;

        CodigoInfo(String codigo) {
            this.codigo = codigo;
            this.expiracao = LocalDateTime.now().plusMinutes(2); // Código expira em 2 minutos
        }

        boolean isValido(String codigo) {
            return this.codigo.equals(codigo) && expiracao.isAfter(LocalDateTime.now());
        }
    }

    private final ObjectMapper mapper = new ObjectMapper();
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final EmailServico emailServico;
    private final Map<String, CodigoInfo> codigosVerificacao = new ConcurrentHashMap<>();

    public AutenticacaoController(EmailServico emailServico) {
        this.emailServico = emailServico;
    }

    public void enviarCodigoVerificacao(Context ctx) {
        try {
            Map<String, String> req = mapper.readValue(ctx.body(), Map.class);
            String email = req.get("email");
            String motivo = req.getOrDefault("motivo", "cadastro");

            String codigo = emailServico.gerarCodigoVerificacao();
            emailServico.enviarCodigoVerificacao(email, codigo, motivo);

            codigosVerificacao.put(email, new CodigoInfo(codigo));

            ctx.status(200).json(Map.of("success", true, "message", "Código de verificação enviado."));
        } catch (Exception e) {
            System.err.println("Erro ao enviar código de verificação: " + e.getMessage());
            e.printStackTrace();
            ctx.status(500).json(Map.of("success", false, "message", "Falha ao enviar e-mail."));
        }
    }
    
    public void verificarCodigo(Context ctx) {
        try {
            Map<String, String> req = mapper.readValue(ctx.body(), Map.class);
            String email = req.get("email");
            String codigo = req.get("codigo");
            CodigoInfo codigoInfo = codigosVerificacao.get(email);

            if (codigoInfo != null && codigoInfo.isValido(codigo)) {
                ctx.status(200).json(Map.of("success", true, "message", "Código verificado com sucesso."));
            } else {
                ctx.status(400).json(Map.of("success", false, "message", "Código inválido ou expirado."));
            }
        } catch (Exception e) {
            ctx.status(500).json(Map.of("success", false, "message", "Erro interno no servidor."));
        }
    }

    public void login(Context ctx) {
        String body = ctx.body();
        if (body == null || body.isEmpty()) {
            ctx.status(400).json(Map.of("success", false, "message", "Requisição inválida. Corpo vazio."));
            return;
        }
        try {
            Map<String, String> loginRequest = mapper.readValue(body, Map.class);
            String emailOuCpf = loginRequest.get("emailOuCpf");
            String senha = loginRequest.get("senha");

            String sql = "SELECT * FROM usuarios WHERE (email = ? OR cpf_cns = ?) AND ativo = TRUE";
            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, emailOuCpf);
                ps.setString(2, emailOuCpf);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        String senhaHash = rs.getString("senha");
                        
                        if (passwordEncoder.matches(senha, senhaHash)) {
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

            String email = user.get("email");
            String codigoRecebido = user.get("codigoVerificacao");
            CodigoInfo codigoInfo = codigosVerificacao.get(email);

            if (codigoInfo == null || !codigoInfo.isValido(codigoRecebido)) {
                ctx.status(400).json(Map.of("success", false, "message", "Código de verificação inválido ou expirado."));
                return;
            }

            String senhaPlana = user.get("senha");
            String senhaHash = passwordEncoder.encode(senhaPlana);

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

                ps.setString(6, senhaHash);
                ps.setString(7, "usuario");
                ps.executeUpdate();
                
                codigosVerificacao.remove(email);
                
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

    public void registrarAdmin(Context ctx) {
         try {
            Map<String, String> user = mapper.readValue(ctx.body(), Map.class);

            String email = user.get("email");
            String codigoRecebido = user.get("codigoVerificacao");
            CodigoInfo codigoInfo = codigosVerificacao.get(email);

            if (codigoInfo == null || !codigoInfo.isValido(codigoRecebido)) {
                ctx.status(400).json(Map.of("success", false, "message", "Código de verificação inválido ou expirado."));
                return;
            }
            
            String senhaPlana = user.get("senha");
            String senhaHash = passwordEncoder.encode(senhaPlana);
            
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
                
                ps.setString(6, senhaHash);
                ps.setString(7, user.get("perfil"));
                ps.executeUpdate();
                
                codigosVerificacao.remove(email);

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
            System.err.println("Erro no endpoint /api/users (criar admin): " + e.getMessage());
            e.printStackTrace();
            ctx.status(500).json(Map.of("success", false, "message", "Erro ao adicionar usuário."));
        }
    }

    public void atualizarComVerificacao(Context ctx) {
        try {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Map<String, String> user = mapper.readValue(ctx.body(), Map.class);

            String email = user.get("email");
            String codigoRecebido = user.get("codigoVerificacao");
            CodigoInfo codigoInfo = codigosVerificacao.get(email);

            if (codigoInfo == null || !codigoInfo.isValido(codigoRecebido)) {
                ctx.status(400).json(Map.of("success", false, "message", "Código de verificação inválido ou expirado."));
                return;
            }
            
            UsuarioController.internalUpdate(id, user);
            codigosVerificacao.remove(email); 
            ctx.json(Map.of("success", true));

        } catch (SQLIntegrityConstraintViolationException e) {
             String campo = e.getMessage().toLowerCase().contains("email") ? "email" : "cpf_cns";
             ctx.status(409).json(Map.of("success", false, "message", "Valor já cadastrado.", "field", campo));
        } catch (Exception e) {
             e.printStackTrace();
             ctx.status(500).json(Map.of("success", false, "message", "Erro ao atualizar usuário."));
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
            
            String hashedNewPassword = passwordEncoder.encode(newPassword);

            String sql = "UPDATE usuarios SET senha = ? WHERE email = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, hashedNewPassword);
                ps.setString(2, email);
                int updatedRows = ps.executeUpdate();
                if (updatedRows > 0) {
                    codigosVerificacao.remove(email);
                    ctx.json(Map.of("success", true));
                } else {
                    ctx.status(404).json(Map.of("success", false, "message", "Email não encontrado."));
                }
            }
        } catch (Exception e) {
            ctx.status(500).json(Map.of("success", false, "message", "Erro ao atualizar a senha."));
        }
    }
}

