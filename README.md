# 🚀 CRM Inteligente - StarTrek

Sistema operacional inteligente e cockpit centralizado para gestão de frotas, despachante, controle de multas, rotinas periódicas e memória contextual por empresa com inteligência artificial integrada.

---

## 📁 Estrutura do Projeto

O repositório foi organizado em módulos claros e desacoplados para facilitar a manutenção e a execução em qualquer ambiente:

```plaintext
CRM_StarTrek/
├── 9router-cloud/          # Gateway de IA (OpenAI-compatible) com suporte a Docker e Node
│   ├── Dockerfile          # Imagem Docker do 9Router (porta 20128)
│   ├── package.json        # Dependência do 9router
│   └── README.md           # Instruções de uso do módulo de IA
│
├── client/                 # Frontend SPA moderno (React 18 + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── App.jsx         # Cockpit operacional, Batalha Naval Kanban, Chat por Empresa
│   │   ├── main.jsx        # Ponto de entrada React
│   │   └── index.css       # Estilos globais e tema Dark Frosted Glass
│   ├── index.html          # HTML principal com FontAwesome e Tailwind
│   └── vite.config.js      # Configuração do Vite com proxy para a API
│
├── server/                 # Backend REST (Node.js + Express)
│   ├── index.js            # Servidor HTTP, rotas de empresas, cards, chat e relatórios
│   ├── db.js               # Camada de dados e persistência operacional
│   ├── data/
│   │   └── crm_store.json  # Banco de dados local persistente
│   └── services/
│       └── aiService.js    # Integração com IA (9Router Nuvem + Fallback Local 20128)
│
├── scripts/                # Scripts de apoio e automações
│   ├── desktop/            # Automação de bandeja do Windows, atalhos e ícones
│   │   ├── iniciar_bandeja.bat
│   │   ├── tray_crm.ps1
│   │   ├── criar_atalho.ps1
│   │   └── crm_app.ico
│   └── tests/              # Testes unitários, diagnósticos de rotas e fluxo operacional
│       ├── test_operational_flow.js
│       ├── test_pdf.js
│       └── test_auth_headers.js
│
├── iniciar_crm.bat         # Inicializador rápido portátil para Windows (porta 3002)
├── iniciar_crm_silencioso.vbs # Inicializador em segundo plano (sem janela preta de prompt)
├── .env.example            # Modelo de configuração de variáveis de ambiente
├── .gitignore              # Proteção contra envio de node_modules e chaves sensíveis
└── package.json            # Scripts de orquestração do monorepo
```

---

## ⚡ Como Rodar em Qualquer Máquina

### 1. Clonar o repositório
```bash
git clone https://github.com/MrFelps/CRM_StarTrek.git
cd CRM_StarTrek
```

### 2. Configurar as Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
*(No Windows PowerShell: `Copy-Item .env.example .env`)*

### 3. Instalar Todas as Dependências (com 1 comando)
```bash
npm run install:all
```
*Esse comando instala as dependências da raiz, do cliente React e do 9Router.*

---

## 🎯 Modos de Execução

### Opção A: Executar Tudo Junto (Recomendado)
Para subir o 9Router local + Servidor Backend + Cliente Frontend de uma só vez:
```bash
npm run dev:all
```

### Opção B: Execução Separada / Modular
- **Apenas o Gateway de IA (9Router local na porta 20128):**
  ```bash
  npm run router
  ```
- **Apenas o Backend (Node.js Express na porta 3002):**
  ```bash
  npm run dev:server
  ```
- **Apenas o Frontend (Vite na porta 5173):**
  ```bash
  npm run dev:client
  ```

### Opção C: Windows com Dois Cliques
Basta dar dois cliques no arquivo:
- `iniciar_crm.bat` ou `iniciar_crm_silencioso.vbs`

---

## 🤖 Como Funciona a Inteligência Artificial (9Router)

O CRM se conecta a modelos avançados de linguagem (como Claude 3.5 Sonnet) com resiliência automática:
1. **Nuvem:** Tenta primeiro a instância hospedada do 9Router.
2. **Local (Offline / Redundância):** Se a nuvem estiver indisponível, conecta diretamente no serviço local rodando na porta `20128` (da pasta `9router-cloud`).
3. **Fallback Heurístico:** Se ambos estiverem inacessíveis, o sistema ativa regras determinísticas de despachante sem quebrar a tela.

### Principais Capacidades da IA:
- **Extração de Multas e Prazos:** Leitura inteligente de arquivos PDF (boletos, autos de infração, descontos do SNE).
- **Memória Operacional por Empresa:** Cada frota possui seu histórico e contexto próprio.
- **Detecção de Atividades:** Identifica automaticamente tarefas em mensagens ou reuniões e sugere criação de cards no Kanban.
- **Preparador de E-mails:** Redação de comunicados formais prontos para cópia com um clique.
- **Síntese Diária:** Pauta prioritária do dia por grau de urgência.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18, Vite, Tailwind CSS, FontAwesome, Drag & Drop nativo.
- **Backend:** Node.js, Express, PDF-Parse, CORS, Dotenv.
- **IA / LLM:** 9Router (OpenAI-compatible gateway), Docker.
- **Armazenamento:** JSON Store local otimizado para operações rápidas.
