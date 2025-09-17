## Projeto MedControl - Guia Completo

Este é o guia para o projeto MedControl, um sistema de monitoramento de medicamentos para UBS do Distrito Federal.

## Estrutura de Pastas e Arquivos

A estrutura abaixo reflete o padrão Maven/Java, onde a organização dos diretórios corresponde à declaração de package nos arquivos .java.

medcontrol-projeto-completo/
│
├── 📁 backend/
│   ├── 📄 pom.xml
│   └── 📁 src/main/java/br/com/medcontrol/
│                                ├── 📄 ApiServer.java  <-- Arquivo principal
│                                ├── 📁 controlador/
│                                │          ├── 📄 MedicamentoController.java
│                                │          ├── 📄 UBSController.java
│                                │          └── 📄 UsuarioController.java
│                                └── 📁 db/
│                                        └── 📄 DB.java
│
├── 📁 database/
│   └── 📄 schema.sql
│
├── 📁 frontend/
│   ├── 📁 pages/
│   ├── 📁 scripts/
│   └── 📁 styles/
│
└── 📄 README.md


## Passo a Passo para Executar
1. Configure o Banco de Dados: Use o schema.sql.

2. Certifique-se de estar com Extension pack for JAVA e Maven for JAVA no VSCODE
3. Execute o Back-end:
        .No VS Code, vá em Arquivo > Abrir Pasta... e selecione apenas a pasta backend.
        .Aguarde a extensão Java sincronizar o projeto (pode levar alguns segundos).
        .Execute(Run) o arquivo ApiServer.java.
4. Execute o Front-end: Abra o frontend/pages/home.html com a extensão "Live Server".
