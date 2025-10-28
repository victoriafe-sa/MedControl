package br.com.medcontrol.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
// Importações para o sistema de log profissional (SLF4J)
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DB {

    // Cria uma instância do logger para esta classe. É a forma correta de registrar eventos e erros.
    private static final Logger logger = LoggerFactory.getLogger(DB.class);

    // --- CONFIGURAÇÕES DO BANCO DE DADOS ---
    // Altere estas variáveis de acordo com a sua configuração local.
    private static final String HOST = "localhost";
    private static final String PORT = "3306"; // <-- Adicionada a porta para fácil alteração
    private static final String DATABASE = "medcontrol_db";
    private static final String USER = "root";
    private static final String PASSWORD = "samyi23s11"; // Altere para a sua senha do MySQL

    // A URL de conexão agora é montada dinamicamente com as variáveis acima.
    private static final String URL = String.format("jdbc:mysql://%s:%s/%s", HOST, PORT, DATABASE);

    private static Connection conn = null;

    /**
     * Obtém uma conexão com o banco de dados.
     * Se a conexão não existir ou estiver fechada, uma nova será criada.
     * @return Uma instância de Connection ou null em caso de falha.
     */
    public static Connection getConnection() {
        try {
            if (conn == null || conn.isClosed()) {
                // Carrega o driver JDBC do MySQL.
                Class.forName("com.mysql.cj.jdbc.Driver");
                // Estabelece a conexão com o banco de dados.
                conn = DriverManager.getConnection(URL, USER, PASSWORD);
                // Log de informação: uma forma mais controlada de exibir mensagens de sucesso.
                logger.info("Conexão com o banco de dados estabelecida com sucesso.");
            }
        } catch (ClassNotFoundException e) {
            // Log de erro: registra a mensagem e a exceção completa (stack trace).
            logger.error("Driver JDBC do MySQL não encontrado.", e);
        } catch (SQLException e) {
            // Log de erro: ideal para capturar falhas de autenticação ou conexão.
            logger.error("Erro ao conectar com o banco de dados.", e);
        }
        return conn;
    }

    /**
     * Fecha a conexão ativa com o banco de dados, se existir.
     */
    public static void closeConnection() {
        if (conn != null) {
            try {
                conn.close();
                conn = null; // Garante que uma nova conexão seja criada na próxima chamada a getConnection()
                logger.info("Conexão com o banco de dados fechada.");
            } catch (SQLException e) {
                logger.error("Erro ao fechar a conexão com o banco de dados.", e);
            }
        }
    }
}
