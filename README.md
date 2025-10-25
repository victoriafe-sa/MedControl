## Projeto MedControl - Guia Completo

Este é o guia para o projeto MedControl, um sistema de monitoramento de medicamentos para UBS do Distrito Federal.

## Estrutura de Pastas e Arquivos

A estrutura abaixo reflete o padrão Maven/Java, onde a organização dos diretórios corresponde à declaração de package nos arquivos .java.

medcontrol-projeto-completo/  
│
├── 📁 backend/  
│   ├── 📄 .gitignore  
│   ├── 📄 pom.xml  
│   ├── 📁 src/main/resources/java/br/com/medcontrol/  
│   │                   │                    ├── 📄 ApiServer.java  <-- Arquivo principal  
│   │                   │                    ├── 📁 controlador/  
│   │                   │                    │          ├── 📄 MedicamentoController.java  
│   │                   │                    │          ├── 📄 UBSController.java  
│   │                   │                    │          ├── 📄 UsuarioController.java  
│   │                   │                    │          └── 📄 AutenticacaoControler.java  
│   │                   │                    ├── 📁 db/  
│   │                   │                    │        └── 📄 DB.java  
│   │                   │                    │    
│   │                   │                    └── 📁 servicos/  
│   │                   │                              ├── 📄 EmailServico.java  (Para a API do Gmail)  
│   │                   │                              ├── 📄 HunterServico.java  (Para API Hunter, verificar se email é TRUE)  
│   │                   │                              ├── 📄 CepServico.java    (Para a API ViaCEP)  
│   │                   │                              └── 📄 DocumentoServico.java (Para a API futura validar o CPF e CNS)  
│   │                   │ 
│   │                   └──📄 credentials.json  
│   │
│   └── 📁 tokens/   
│            └── 📄 StoredCredential  
│
├── 📁 database/  
│          └── 📄 schema.sql  
│
├── 📁 frontend/  
│    ├── 📁 pages/  
│    │         ├── 📄 TelaLoginCadastro.html  
│    │         ├── 📄 TelaUsuario.html  
│    │         ├── 📄 Admin.html  
│    │         └── 📄 Home.html  
│    ├── 📁 scripts/  
│    │         ├── 📄 TelaLoginCadastro.js  
│    │         ├── 📄 TelaUsuario.js  
│    │         ├── 📄 Admin.js  
│    │         └── 📄 Home.js  
│    └── 📁 styles/  
│              ├── 📄 TelaLoginCadastro.css  
│              ├── 📄 TelaUsuario.css  
│              ├── 📄 Admin.css  
│              └── 📄 Home.css  
│
└── 📄 README.md  


## Passo a Passo para Executar
1. Configure o Banco de Dados: Use o schema.sql.
2. Verifique o arquivo de conexão com o banco para atualizar a senha do seu MySQL (backend/src//java/br/com/medcontrol/db/DB.java)
3. Certifique-se de estar com Extension pack for JAVA e Maven for JAVA no VSCODE
4. Execute o Back-end:
        .No VS Code, vá em Arquivo > Abrir Pasta... e selecione apenas a pasta backend.
        .Aguarde a extensão Java sincronizar o projeto (pode levar alguns segundos).
        .Execute(Run Java) o arquivo ApiServer.java.
5. Execute o Front-end: Abra o frontend/pages/home.html com a extensão "Live Server".


