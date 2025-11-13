package br.com.medcontrol.controlador;

import br.com.medcontrol.db.DB;
import br.com.medcontrol.servicos.EmailServico;
import br.com.medcontrol.servicos.HunterServico;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference; 
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

    // Classe interna para armazenar o código de verificação e sua data de expiração.
    private static class CodigoInfo {
        String codigo;
        LocalDateTime expiracao;

        CodigoInfo(String codigo) {
            this.codigo = codigo;
            // Define o tempo de expiração para 2 minutos a partir do momento da criação.
            this.expiracao = LocalDateTime.now().plusMinutes(2); 
        }

        // Verifica se o código informado é igual ao armazenado E se ainda não expirou.
        boolean isValido(String codigo) {
            return this.codigo.equals(codigo) && expiracao.isAfter(LocalDateTime.now());
        }
    }

    private final ObjectMapper mapper = new ObjectMapper();
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    // Injeção de dependência dos serviços de E-mail e Hunter.
    private final EmailServico emailServico;
    private final HunterServico hunterServico;
    // Mapa para armazenar os códigos de verificação em memória.
    private final Map<String, CodigoInfo> codigosVerificacao = new ConcurrentHashMap<>();

    // O construtor recebe o serviço de e-mail
    public AutenticacaoController(EmailServico emailServico) {
        this.emailServico = emailServico;
        this.hunterServico = new HunterServico(); 
    }

    public void verificarExistencia(Context ctx) {
        try {
            Map<String, Object> req = mapper.readValue(ctx.body(), new TypeReference<Map<String, Object>>() {});
            String email = (String) req.get("email");
            String cpfCns = (String) req.get("cpf_cns");
            Object idObject = req.get("id");
            String idUsuario = (idObject != null) ? String.valueOf(idObject) : null;


            Map<String, Boolean> existencia = new HashMap<>();
            existencia.put("email", false);
            existencia.put("cpf_cns", false);

            String sqlEmail = "SELECT EXISTS (SELECT 1 FROM usuarios WHERE email = ? AND (? IS NULL OR id != ?))";
            String sqlCpfCns = "SELECT EXISTS (SELECT 1 FROM usuarios WHERE cpf_cns = ? AND (? IS NULL OR id != ?))";

            try (Connection conn = DB.getConnection()) {
                if (email != null && !email.isEmpty()) {
                    try (PreparedStatement ps = conn.prepareStatement(sqlEmail)) {
                        ps.setString(1, email);
                        ps.setString(2, idUsuario);
                        ps.setString(3, idUsuario);
                        try (ResultSet rs = ps.executeQuery()) {
                            if (rs.next() && rs.getBoolean(1)) {
                                existencia.put("email", true);
                            }
                        }
                    }
                }
                if (cpfCns != null && !cpfCns.isEmpty()) {
                    try (PreparedStatement ps = conn.prepareStatement(sqlCpfCns)) {
                        ps.setString(1, cpfCns);
                        ps.setString(2, idUsuario);
                        ps.setString(3, idUsuario);
                        try (ResultSet rs = ps.executeQuery()) {
                            if (rs.next() && rs.getBoolean(1)) {
                                existencia.put("cpf_cns", true);
                            }
                        }
                    }
                }
            }
            ctx.json(existencia);

        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("error", "Erro interno ao verificar dados."));
        }
    }

    // Endpoint: POST /api/usuarios/enviar-codigo-verificacao
    public void enviarCodigoVerificacao(Context ctx) {
        try {
            Map<String, String> req = mapper.readValue(ctx.body(), new TypeReference<Map<String, String>>() {});
            String email = req.get("email");
            
            // --- ETAPA 4 (Fluxo) & PONTO DE CONTATO COM API HUNTER.IO ---
            // Antes de gastar recursos enviando um e-mail, verifica se o e-mail é "entregável".
            if (!hunterServico.isEmailValido(email)) {
                ctx.status(400).json(Map.of("success", false, "message", "O endereço de e-mail é inválido ou não pode receber mensagens."));
                return; // Interrompe a execução se o e-mail for inválido.
            }

            // --- ETAPA 5 (Fluxo) & PONTO DE CONTATO COM API GMAIL ---
            // Continua o fluxo normal se o e-mail for válido
            String motivo = req.getOrDefault("motivo", "cadastro");
            // Gera um código de 6 dígitos seguro.
            String codigo = emailServico.gerarCodigoVerificacao();
            // Utiliza o serviço para enviar o e-mail através da API do Gmail.
            emailServico.enviarCodigoVerificacao(email, codigo, motivo);

            // Armazena o código gerado em memória com a data de expiração.
            codigosVerificacao.put(email, new CodigoInfo(codigo));

            // --- ETAPA 6 (Fluxo) ---
            // Retorna sucesso para o frontend, que irá exibir a tela de inserção de código.
            ctx.status(200).json(Map.of("success", true, "message", "Código de verificação enviado."));
        } catch (Exception e) {
            System.err.println("Erro ao enviar código de verificação: " + e.getMessage());
            e.printStackTrace();
            ctx.status(500).json(Map.of("success", false, "message", "Falha ao enviar e-mail."));
        }
    }
    
    // Endpoint: POST /api/usuarios/verificar-codigo
    // Usado principalmente para o fluxo de recuperação de senha, para validar o código antes de pedir a nova senha.
    public void verificarCodigo(Context ctx) {
        try {
            Map<String, String> req = mapper.readValue(ctx.body(), new TypeReference<Map<String, String>>() {});
            String email = req.get("email");
            String codigo = req.get("codigo");
            
            // --- ETAPA 9 (Fluxo) ---
            // Recupera o código armazenado para este e-mail.
            CodigoInfo codigoInfo = codigosVerificacao.get(email);

            // Valida se o código existe, se é o mesmo informado e se não expirou.
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
            Map<String, String> loginRequest = mapper.readValue(body, new TypeReference<Map<String, String>>() {});
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
                            user.put("logradouro", rs.getString("logradouro"));
                            user.put("bairro", rs.getString("bairro"));
                            user.put("cidade", rs.getString("cidade"));
                            user.put("uf", rs.getString("uf"));
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


    // Endpoint: POST /api/register
    // Finaliza o processo de cadastro após a validação do código.
    public void registrar(Context ctx) {
        try {
            Map<String, Object> user = mapper.readValue(ctx.body(), new TypeReference<Map<String, Object>>() {});

            String email = (String) user.get("email");
            String codigoRecebido = (String) user.get("codigoVerificacao");
            
            // --- ETAPA 9 (Fluxo) ---
            // Recupera e valida o código da mesma forma que o endpoint de verificação.
            CodigoInfo codigoInfo = codigosVerificacao.get(email);

            if (codigoInfo == null || !codigoInfo.isValido(codigoRecebido)) {
                ctx.status(400).json(Map.of("success", false, "message", "Código de verificação inválido ou expirado."));
                return;
            }

            // --- ETAPA 10 (Fluxo - Sucesso) ---
            // Se o código for válido, o processo continua.
            String senhaPlana = (String) user.get("senha");
            String senhaHash = passwordEncoder.encode(senhaPlana);

            String cep = (String) user.get("cep");
            
            // MODIFICAÇÃO 2.2: Remove latitude/longitude e obtém campos de endereço
            String logradouro = (String) user.get("logradouro");
            String bairro = (String) user.get("bairro");
            String cidade = (String) user.get("cidade");
            String uf = (String) user.get("uf");
            // MODIFICAÇÃO 2.2: Remove lógica BigDecimal

            // MODIFICAÇÃO 2.2: SQL Atualizado
            String sql = "INSERT INTO usuarios (nome, email, cpf_cns, cep, logradouro, bairro, cidade, uf, data_nascimento, senha, perfil) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                
                ps.setString(1, (String) user.get("nome"));
                ps.setString(2, (String) user.get("email"));
                ps.setString(3, (String) user.get("cpf_cns"));
                ps.setString(4, cep); 

                // MODIFICAÇÃO 2.2: Adiciona novos campos
                ps.setString(5, logradouro);
                ps.setString(6, bairro);
                ps.setString(7, cidade);
                ps.setString(8, uf);

                // ?9 = data_nascimento (era 7)
                String dataNascimento = (String) user.get("data_nascimento");
                if (dataNascimento == null || dataNascimento.trim().isEmpty()) {
                    ps.setNull(9, Types.DATE);
                } else {
                    ps.setDate(9, Date.valueOf(dataNascimento));
                }

                // ?10 = senha (era 8)
                ps.setString(10, senhaHash);
                // ?11 = perfil (era 9)
                ps.setString(11, "usuario"); 
                
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
            Map<String, Object> user = mapper.readValue(ctx.body(), new TypeReference<Map<String, Object>>() {});

            String email = (String) user.get("email");
            String codigoRecebido = (String) user.get("codigoVerificacao");

            CodigoInfo codigoInfo = codigosVerificacao.get(email);

            if (codigoInfo == null || !codigoInfo.isValido(codigoRecebido)) {
                ctx.status(400).json(Map.of("success", false, "message", "Código de verificação inválido ou expirado."));
                return;
            }
            
            String senhaPlana = (String) user.get("senha");
            String senhaHash = passwordEncoder.encode(senhaPlana);

            String cep = (String) user.get("cep");

            String logradouro = (String) user.get("logradouro");
            String bairro = (String) user.get("bairro");
            String cidade = (String) user.get("cidade");
            String uf = (String) user.get("uf");
            
            // MODIFICAÇÃO 2.2: SQL Atualizado
            String sql = "INSERT INTO usuarios (nome, email, cpf_cns, cep, logradouro, bairro, cidade, uf, data_nascimento, senha, perfil) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            try (Connection conn = DB.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                
                ps.setString(1, (String) user.get("nome"));
                ps.setString(2, (String) user.get("email"));
                ps.setString(3, (String) user.get("cpf_cns"));
                ps.setString(4, cep);
                
                // MODIFICAÇÃO 2.2: Adiciona novos campos
                ps.setString(5, logradouro);
                ps.setString(6, bairro);
                ps.setString(7, cidade);
                ps.setString(8, uf);
                
                // ?9 = data_nascimento (era 7)
                String dataNascimento = (String) user.get("data_nascimento");
                if (dataNascimento == null || dataNascimento.trim().isEmpty()) {
                    ps.setNull(9, Types.DATE);
                } else {
                    ps.setDate(9, Date.valueOf(dataNascimento));
                }
                
                // ?10 = senha (era 8)
                ps.setString(10, senhaHash);
                // ?11 = perfil (era 9)
                ps.setString(11, (String) user.get("perfil"));

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
            Map<String, Object> userObj = mapper.readValue(ctx.body(), new TypeReference<Map<String, Object>>() {});

            String email = (String) userObj.get("email");
            String codigoRecebido = (String) userObj.get("codigoVerificacao");

            CodigoInfo codigoInfo = codigosVerificacao.get(email);

            if (codigoInfo == null || !codigoInfo.isValido(codigoRecebido)) {
                ctx.status(400).json(Map.of("success", false, "message", "Código de verificação inválido ou expirado."));
                return;
            }
            
            UsuarioController.internalUpdate(id, userObj); 
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
            Map<String, String> req = mapper.readValue(ctx.body(), new TypeReference<Map<String, String>>() {});
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
            Map<String, String> req = mapper.readValue(ctx.body(), new TypeReference<Map<String, String>>() {});
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