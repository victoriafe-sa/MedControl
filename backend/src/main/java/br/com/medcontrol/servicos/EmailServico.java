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

public class EmailServico {
    private static final String APPLICATION_NAME = "MedControl";
    private static final String TOKENS_DIRECTORY_PATH = "tokens";
    private static final String CREDENTIALS_FILE_PATH = "/credentials.json";
    private final Gmail service;

    public EmailServico() {
        try {
            this.service = getGmailService();
        } catch (IOException | GeneralSecurityException e) {
            e.printStackTrace();
            throw new RuntimeException("Falha ao inicializar o serviço do Gmail", e);
        }
    }

    private Credential authorize() throws IOException, GeneralSecurityException {
        InputStream in = EmailServico.class.getResourceAsStream(CREDENTIALS_FILE_PATH);
        if (in == null) throw new IOException("Arquivo de credenciais não encontrado: " + CREDENTIALS_FILE_PATH);

        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(GsonFactory.getDefaultInstance(), new InputStreamReader(in));
        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                GoogleNetHttpTransport.newTrustedTransport(), GsonFactory.getDefaultInstance(), clientSecrets,
                Collections.singletonList(GmailScopes.GMAIL_SEND))
                .setDataStoreFactory(new FileDataStoreFactory(new java.io.File(TOKENS_DIRECTORY_PATH)))
                .setAccessType("offline").build();

        LocalServerReceiver receiver = new LocalServerReceiver.Builder().setPort(8888).build();
        return new AuthorizationCodeInstalledApp(flow, receiver).authorize("user");
    }

    private Gmail getGmailService() throws IOException, GeneralSecurityException {
        return new Gmail.Builder(GoogleNetHttpTransport.newTrustedTransport(), GsonFactory.getDefaultInstance(), authorize())
                .setApplicationName(APPLICATION_NAME).build();
    }

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

    private Message createMessageFromMime(MimeMessage mimeMessage) throws MessagingException, IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        mimeMessage.writeTo(buffer);
        byte[] bytes = buffer.toByteArray();
        String encodedEmail = Base64.encodeBase64URLSafeString(bytes);
        Message message = new Message();
        message.setRaw(encodedEmail);
        return message;
    }

    public void enviarCodigoVerificacao(String destinatario, String codigo, String motivo) {
        try {
            String assunto = "";
            String corpo = "";
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
            MimeMessage mimeMessage = createMimeMessage(destinatario, "me", assunto, corpo);
            Message message = createMessageFromMime(mimeMessage);

            // "me" refere-se à conta autorizada via OAuth 2.0
            service.users().messages().send("me", message).execute();
            System.out.println("E-mail de verificação enviado com sucesso para: " + destinatario);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Falha ao enviar e-mail via API do Gmail", e);
        }
    }

    public String gerarCodigoVerificacao() {
        return String.format("%06d", new Random().nextInt(999999));
    }
}
