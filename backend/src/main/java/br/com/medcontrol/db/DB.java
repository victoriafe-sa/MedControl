package br.com.medcontrol.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DB {

    private static final Logger logger = LoggerFactory.getLogger(DB.class);

    // --- CONFIGURAÇÕES DO BANCO DE DADOS ---
    private static final String HOST = "localhost";
    private static final String PORT = "3306";
    private static final String DATABASE = "medcontrol_db";
    private static final String USER = "root";
    private static final String PASSWORD = "samyi23s11"; // Mantenha sua senha
    private static final String URL = String.format("jdbc:mysql://%s:%s/%s", HOST, PORT, DATABASE);

    // --- REMOVA A CONEXÃO ESTÁTICA ---
    // private static Connection conn = null; // <-- REMOVA ESTA LINHA

    /**
     * Obtém uma NOVA conexão com o banco de dados.
     * @return Uma nova instância de Connection ou null em caso de falha.
     */
    public static Connection getConnection() {
        try {
            // 1. Carrega o driver
            Class.forName("com.mysql.cj.jdbc.Driver");
            
            // 2. Cria e retorna uma NOVA conexão
            Connection newConn = DriverManager.getConnection(URL, USER, PASSWORD);
            
            // Opcional: logar que uma nova conexão foi criada (pode ser removido em produção)
            logger.info("Nova conexão com o banco de dados estabelecida.");
            
            return newConn;

        } catch (ClassNotFoundException e) {
            logger.error("Driver JDBC do MySQL não encontrado.", e);
        } catch (SQLException e) {
            logger.error("Erro ao conectar com o banco de dados.", e);
        }
        
        // Retorna null se a criação da conexão falhar
        return null;
    }

    /**
     * Este método não é mais necessário, pois o try-with-resources
     * em cada controlador já fecha a conexão individual.
     */
    /*
    public static void closeConnection() {
        // ... (REMOVA OU COMENTE ESTE MÉTODO)
    }
    */
}