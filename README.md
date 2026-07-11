<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=32&duration=2800&pause=800&color=25D366&center=true&vCenter=true&width=700&lines=%F0%9F%93%9E+WaCalls+SaaS;WhatsApp+multi-conex%C3%A3o+SaaS+%2B+React;Chat+%C2%B7+Kanban+%C2%B7+Flowbuilder+%C2%B7+Webhooks;100%25+Open+Source+%F0%9F%92%9A" alt="WaCalls SaaS" />

<br/>

# 📞 WaCalls (Fork SaaS com Integrações)

**Plataforma de atendimento WhatsApp multi-conexão em Go + React.**
Uma versão aprimorada da plataforma original com foco em controle comercial multi-tenant, integração externa (Chatwoot & Webhooks) e correções de produção.

<br/>

[![Go](https://img.shields.io/badge/Go-1.26+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[![whatsmeow](https://img.shields.io/badge/whatsmeow-multi--device-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/tulir/whatsmeow)
[![SQLite](https://img.shields.io/badge/SQLite-embedded-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](#-licença)

<br/>

![Status](https://img.shields.io/badge/status-production--stable-success?style=flat-square)
![Made with love](https://img.shields.io/badge/made%20with-%E2%9D%A4-red?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)

<br/>

</div>

---

> 💚 **Nota sobre o Fork:** Este projeto é um fork de [raphaelbat/wacalls-chat](https://github.com/raphaelbat/wacalls-chat) (que por sua vez descende do WaCalls core), trazendo melhorias comerciais para o modo SaaS, integrações de Webhook e Chatwoot nativas por conexão e estabilização de conexões e chamadas.

---

## ✨ O que esta versão inclui (Diferenciais)

Além das funções básicas de chat, usuários, filas e conexões por QR Code, esta versão implementa e reabilita:

### ⚙️ 1. Integrações nativas por Conexão
Configurável individualmente nas abas de cada conexão (Editar Conexão):
*   💬 **Integração Chatwoot:** Sincronização automática bidirecional de conversas, envio e recebimento de mensagens e mídias em tempo real.
*   🔗 **Webhooks Ativos (HMAC-SHA256):** Disparo de eventos HTTP POST assíncronos para integração com sistemas externos e ferramentas de automação (como N8N, Make, etc.).
    *   `message.received` (Novas mensagens recebidas)
    *   `message.sent` (Mensagens enviadas via painel/chat)
    *   `call.status` (Eventos de chamadas: ligando, ativa, encerrada)
    *   *Assinatura de Segurança:* Cada webhook envia o cabeçalho `X-WaCalls-Signature` contendo um hash HMAC gerado com o token configurado para garantir a autenticidade da requisição.

### 🛡️ 2. Controle de Acesso e Recursos SaaS (Por Empresa)
*   **Controle de Módulos Dinâmico:** No painel de Super Admin (`admin@pontodosoftware.shop`), o administrador do SaaS pode ligar/desligar de forma granular os recursos que cada empresa (tenant) parceira tem direito de usar.
*   **Módulos que podem ser ativados/desativados por empresa:**
    *   🗂️ **Kanban / Pipeline:** Quadro CRM para controle visual de funil de vendas.
    *   🤖 **Flowbuilder (URA):** Construtor visual de fluxos de chatbot.
    *   📞 **Discador / Campanhas:** Campanhas automáticas e disparos de áudio e texto em massa.
    *   ⚡ **Respostas Rápidas:** Atalhos de mensagens pré-configuradas.
    *   📣 **Mural de Avisos:** Quadro de avisos internos para operadores.
    *   📅 **Agendamentos:** Programação de disparos de mensagens.
    *   📊 **Relatórios:** Dashboards de desempenho.
*   **Herança Automática:** Sub-usuários (operadores) de uma empresa herdam o perfil de recursos da empresa-mãe em tempo real ao se autenticarem.

### 🐛 3. Correções e Estabilidade (Fixes)
*   **WhatsApp Reconnect:** Corrigido o bug de erro `400` que impedia a reconexão automática ou manual de números desconectados do WhatsApp.
*   **Chamadas VoIP (409 Conflict):** Tratada a duplicidade de chamadas no broker que causava instabilidades e travava conexões.
*   **CPF/CNPJ Alfanumérico:** Suporte de validação adaptado para CPFs e CNPJs alfanuméricos para conformidade com registros especiais do SaaS.

---

## 🧱 Stack

- ⚙️ **Backend:** Go 1.26+, SQLite embarcado (pure-Go, sem CGO), Redis opcional.
- 🎨 **Frontend:** React 19 + Vite 7 + Tailwind + shadcn/ui.
- 📲 **WhatsApp:** [whatsmeow](https://github.com/tulir/whatsmeow) (lib base Go multi-device).
- 🚀 **Deploy:** Binário único empacotando a API e servindo os arquivos estáticos na mesma porta.

---

## ⚡ Instalação rápida (VPS Linux)

Requisitos mínimos: **Go 1.26+**, **Node.js 20+**, **npm**, **unzip**, **systemd**.

### 1️⃣ Instalação Automática via Fork

Substitua `SEU_USUARIO` pelo seu usuário do GitHub no comando abaixo:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/patriciosilva83/wacalls-chat/main/client/scripts/instalador_wacalls.sh) \
  git https://github.com/patriciosilva83/wacalls-chat.git main
```

### 2️⃣ Instalação Manual

```bash
# Clone e entre no diretório
git clone https://github.com/patriciosilva83/wacalls-chat.git
cd wacalls-chat

# Compile o Backend
go build -o wacalls ./cmd/server

# Compile o Frontend
cd client
npm install
npm run build   # isso gera a pasta client/dist que o Go usará para servir a interface
cd ..

# Execute a primeira vez para gerar o banco de dados e o Admin inicial
./wacalls -addr :8080 -db /var/lib/wacalls/wacalls.db
```

Na primeira execução, o administrador padrão `wacalls@admin.com` com a senha `admin` é semeado. Para rodar configurando o seu próprio administrador principal:

```bash
./wacalls -seed-admin-email admin@meusite.com -seed-admin-password SenhaSeguraAqui
```

---

## 🔧 Configurações do Ambiente (`.env`)

Na raiz do projeto (ou no diretório onde o binário roda), configure o arquivo `.env`:

```env
# Banco de dados (padrão SQLite)
DB_DRIVER=sqlite

# Ou PostgreSQL para ambientes de grande escala (Branch postgres-dev)
# DB_DRIVER=postgres
# DB_DSN=postgres://usuario:senha@localhost:5432/nome_banco?sslmode=disable

# Redis opcional — Necessário apenas se você for rodar em Cluster/Multi-instâncias
REDIS_URL=redis://:senha@127.0.0.1:6379/0
```

### 🐳 Deploy & Testes Rápidos com Docker (PostgreSQL + Redis + App)

Nesta branch `postgres-dev`, você pode rodar a aplicação inteira em containers orquestrados em segundos:

```bash
# 1. Certifique-se de que está na branch postgres-dev
git checkout postgres-dev

# 2. Inicie todos os containers (Go App, PostgreSQL 16 e Redis 7)
docker-compose up --build -d
```
Acesse em: `http://localhost:8080` (o banco Postgres inicializa e cria todas as migrations automaticamente na porta `5432`).

---

## 🛠️ Executando com Systemd (Produção)

Crie o arquivo de serviço `/etc/systemd/system/wacalls.service`:

```ini
[Unit]
Description=WaCalls SaaS Service
After=network.target

[Service]
WorkingDirectory=/opt/wacalls
EnvironmentFile=/opt/wacalls/.env
ExecStart=/opt/wacalls/wacalls -addr :55839 -db /www/wwwroot/wacalls-chat/wacalls.db
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

Ative e inicialize:
```bash
systemctl daemon-reload
systemctl enable --now wacalls
systemctl status wacalls
```

---

## 👥 Contribuidores & Créditos Originais

Este projeto estende e homenageia os mantenedores da base de desenvolvimento original:

*   👨‍💻 [**JotaDev66**](https://github.com/jotadev66) — Lib base (WaCalls core)
*   👨‍💻 [**jobasfernandes**](https://github.com/jobasfernandes) — Contribuidor
*   🚀 [**Raphaelbat**](https://github.com/raphaelbat) — Implementação das conexões, fila, chat básico, mural e instalador original.
*   📺 **Canal [Vem Fazer](https://youtube.com/@vemfazer)** — Pelo incentivo e disseminação da cultura de código aberto para a comunidade de telefonia e chat.

Agradecemos e incentivamos contribuições! Se você gostou das customizações e novos recursos integrados por mim (**@patriciosilva83**), deixe sua ⭐ neste repositório.

---

## 📜 Licença

Distribuído sob a licença **MIT**. Uso livre para fins comerciais e pessoais.
