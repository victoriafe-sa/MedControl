//Código original para integração com a API do Gmail (desativado para testes):
package br.com.medcontrol.servicos;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.GmailScopes;
import com.google.api.services.gmail.model.Message;
import org.apache.commons.codec.binary.Base64;

import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.Properties;
import java.util.Random;

// Esta classe encapsula toda a complexidade de interagir com a API do Gmail.
public class EmailServico {
    // Identificadores para o processo de autenticação OAuth 2.0 do Google.
    private static final String APPLICATION_NAME = "MedControl";
    // Diretório onde os tokens de autorização serão armazenados após o usuário permitir o acesso.
    private static final String TOKENS_DIRECTORY_PATH = "tokens";
    // Caminho para o arquivo JSON com as credenciais da aplicação (gerado no Google Cloud Console).
    private static final String CREDENTIALS_FILE_PATH = "/credentials.json";
    // O objeto de serviço principal que permite interagir com a API.
    private final Gmail service;

    public EmailServico() {
        try {
            // Ao criar uma instância de EmailServico, ele imediatamente tenta se autenticar e obter o serviço do Gmail.
            this.service = getGmailService();
        } catch (IOException | GeneralSecurityException e) {
            e.printStackTrace();
            throw new RuntimeException("Falha ao inicializar o serviço do Gmail", e);
        }
    }

    // Este método gerencia o fluxo de autorização OAuth 2.0.
    private Credential authorize() throws IOException, GeneralSecurityException {
        // Carrega o arquivo credentials.json do projeto.
        InputStream in = EmailServico.class.getResourceAsStream(CREDENTIALS_FILE_PATH);
        if (in == null) throw new IOException("Arquivo de credenciais não encontrado: " + CREDENTIALS_FILE_PATH);

        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(GsonFactory.getDefaultInstance(), new InputStreamReader(in));
        
        // Configura o fluxo de autorização, especificando o escopo (permissão) necessário.
        // GmailScopes.GMAIL_SEND significa que estamos pedindo permissão apenas para ENVIAR e-mails.
        // setDataStoreFactory especifica que os tokens de acesso devem ser salvos em um arquivo no diretório "tokens".
        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                GoogleNetHttpTransport.newTrustedTransport(), GsonFactory.getDefaultInstance(), clientSecrets,
                Collections.singletonList(GmailScopes.GMAIL_SEND))
                .setDataStoreFactory(new FileDataStoreFactory(new java.io.File(TOKENS_DIRECTORY_PATH)))
                .setAccessType("offline").build();

        // Na primeira execução, isso abrirá o navegador para que o usuário autorize a aplicação.
        // Nas execuções subsequentes, ele reutilizará os tokens salvos no diretório "tokens".
        LocalServerReceiver receiver = new LocalServerReceiver.Builder().setPort(8888).build();
        return new AuthorizationCodeInstalledApp(flow, receiver).authorize("user");
    }

    // Constrói o objeto de serviço do Gmail usando as credenciais autorizadas.
    private Gmail getGmailService() throws IOException, GeneralSecurityException {
        return new Gmail.Builder(GoogleNetHttpTransport.newTrustedTransport(), GsonFactory.getDefaultInstance(), authorize())
                .setApplicationName(APPLICATION_NAME).build();
    }

    // Método auxiliar que cria um objeto de e-mail padrão (MimeMessage) usando a biblioteca JavaMail.
    private MimeMessage createMimeMessage(String to, String from, String subject, String bodyText) throws MessagingException {
        Properties props = new Properties();
        Session session = Session.getDefaultInstance(props, null);
        MimeMessage email = new MimeMessage(session);
        email.setFrom(new InternetAddress(from));
        email.addRecipient(javax.mail.Message.RecipientType.TO, new InternetAddress(to));
        email.setSubject(subject);
        email.setText(bodyText);
        return email;
    }

    // Converte o objeto MimeMessage para o formato exigido pela API do Gmail.
    private Message createMessageFromMime(MimeMessage mimeMessage) throws MessagingException, IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        mimeMessage.writeTo(buffer);
        byte[] bytes = buffer.toByteArray();
        // A API requer que o conteúdo do e-mail seja codificado em Base64URLSafeString.
        String encodedEmail = Base64.encodeBase64URLSafeString(bytes);
        Message message = new Message();
        message.setRaw(encodedEmail);
        return message;
    }

    // Método principal que é chamado pelo controlador para enviar o código de verificação.
    public void enviarCodigoVerificacao(String destinatario, String codigo, String motivo) {
        try {
            String assunto = "";
            String corpo = "";
            // Personaliza o conteúdo do e-mail com base no motivo.
            switch (motivo) {
                case "cadastro":
                    assunto = "Seu Código de Verificação MedControl";
                    corpo = "Olá,\n\nO seu código para finalizar o cadastro no MedControl é: " + codigo;
                    break;
                case "recuperacao":
                    assunto = "Recuperação de Senha - MedControl";
                    corpo = "Olá,\n\nRecebemos uma solicitação para redefinir sua senha. Use o código a seguir para continuar: " + codigo;
                    break;
                case "alteracao":
                    assunto = "Confirmação de Alteração de E-mail - MedControl";
                    corpo = "Olá,\n\nPara confirmar a alteração do seu e-mail no MedControl, use o código: " + codigo;
                    break;
                default:
                    assunto = "Código de Verificação MedControl";
                    corpo = "Seu código de verificação é: " + codigo;
            }
            // Cria a mensagem Mime e a converte para o formato da API.
            MimeMessage mimeMessage = createMimeMessage(destinatario, "me", assunto, corpo);
            Message message = createMessageFromMime(mimeMessage);

            // Realiza a chamada à API do Gmail para enviar a mensagem.
            // "me" é um identificador especial que se refere à conta de e-mail que foi autorizada via OAuth 2.0.
            service.users().messages().send("me", message).execute();
            System.out.println("E-mail de verificação enviado com sucesso para: " + destinatario);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Falha ao enviar e-mail via API do Gmail", e);
        }
    }

    // Gera um número aleatório e o formata como uma string de 6 dígitos.
    public String gerarCodigoVerificacao() {
        return String.format("%06d", new Random().nextInt(999999));
    }
}

/*
package br.com.medcontrol.servicos;

// --- VERSÃO DE TESTE (MODO MOCK) ---
// Esta versão da classe é usada para desenvolvimento e testes locais
// para evitar a necessidade de configurar a API do Gmail a todo momento.
// Ela não envia e-mails reais, apenas simula o processo no console.
public class EmailServico {
    
    public EmailServico() {
        // Construtor vazio, pois a inicialização real do serviço do Gmail foi removida.
        System.out.println("--- MODO DE TESTE: EmailServico inicializado sem a API do Gmail. ---");
        
    }

   
    // Simula o envio de e-mail imprimindo as informações no console.
    public void enviarCodigoVerificacao(String destinatario, String codigo, String motivo) {
        System.out.println("--- MODO DE TESTE: Simulação de envio de e-mail (API Gmail desativada) ---");
        System.out.println("Destinatário: " + destinatario);
        System.out.println("Código: " + codigo);
        System.out.println("Motivo: " + motivo);
        System.out.println("---------------------------------------------------------------------");

      
    }

   
    // Retorna um código fixo para facilitar os testes automatizados e manuais.
    public String gerarCodigoVerificacao() {
        return "000000"; // Código fixo para facilitar os testes.
        
    }
}
*/