package br.com.medcontrol.servicos;

import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import java.util.Properties;
import java.util.Random;

public class EmailServico {

    // IMPORTANTE: Substitua com suas credenciais reais do Gmail.
    // Recomenda-se usar uma "Senha de App" para segurança.
    private final String username = "@gmail.com";
    private final String password = "Senha APP";

    private final Properties props;

    public EmailServico() {
        props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", "smtp.gmail.com");
        props.put("mail.smtp.port", "587");
    }

    public String gerarCodigoVerificacao() {
        return String.format("%06d", new Random().nextInt(999999));
    }

    public void enviarCodigoVerificacao(String destinatario, String codigo, String motivo) {
        Session session = Session.getInstance(props, new Authenticator() {
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
        });

        try {
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(username));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(destinatario));
            
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

            message.setSubject(assunto);
            message.setText(corpo);

            Transport.send(message);
            System.out.println("E-mail de verificação enviado com sucesso para: " + destinatario);

        } catch (MessagingException e) {
            System.err.println("Falha ao enviar e-mail de verificação para: " + destinatario);
            e.printStackTrace();
            throw new RuntimeException(e);
        }
    }
}

