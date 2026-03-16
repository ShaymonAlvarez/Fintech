# 💰 Finanças — Controle Financeiro Pessoal

Sistema completo de controle financeiro com **Bot do Telegram** para registrar transações e **Dashboard Web** para visualizar e gerenciar suas finanças.

---

## 🏗️ Arquitetura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Telegram    │ ──▶  │  Bot Python   │ ──▶  │  SQLite Database │
│  (Input)     │      │  (Parsing)    │      │                  │
└─────────────┘      └──────────────┘      └────────┬────────┘
                                                     │
                                                     ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Dashboard   │ ◀── │  Next.js      │ ◀── │  FastAPI         │
│  (Browser)   │     │  (Frontend)   │     │  (Backend/API)   │
└─────────────┘      └──────────────┘      └─────────────────┘
```

## 📦 Tecnologias

| Componente      | Tecnologia                       |
|-----------------|----------------------------------|
| Backend/API     | Python + FastAPI                 |
| Bot Telegram    | python-telegram-bot              |
| Banco de Dados  | SQLite (zero config)             |
| Frontend        | Next.js 14 + Tailwind + Recharts |
| Autenticação    | JWT + bcrypt                     |

---

## 🚀 Setup Rápido

### Pré-requisitos

- **Python 3.10+**
- **Node.js 18+**
- **Token do Telegram Bot** (veja abaixo como criar)

### 1. Backend (API + Bot)

```bash
# Entrar na pasta do backend
cd backend

# Criar ambiente virtual
python -m venv venv

# Ativar (Windows)
venv\Scripts\activate

# Ativar (Linux/Mac)
# source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
copy .env.example .env
# Edite o .env com seu TOKEN do bot e seu TELEGRAM ID

# Rodar a API
python main.py
```

A API estará em: **http://localhost:8000**
Docs automáticos: **http://localhost:8000/docs**

### 2. Bot do Telegram

```bash
# Em outro terminal, na pasta backend (com venv ativado)
cd backend
venv\Scripts\activate
python bot.py
```

### 3. Frontend (Dashboard)

```bash
# Em outro terminal
cd frontend

# Configurar API URL
copy .env.local.example .env.local

# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev
```

O dashboard estará em: **http://localhost:3000**

---

## 🤖 Configurando o Bot do Telegram

### Passo 1: Criar o Bot
1. Abra o Telegram e procure por **@BotFather**
2. Envie `/newbot`
3. Escolha um nome (ex: "Minhas Finanças")
4. Escolha um username (ex: "minhas_financas_bot")
5. Copie o **token** que o BotFather enviar

### Passo 2: Descobrir seu Telegram ID
1. Procure por **@userinfobot** no Telegram
2. Envie `/start`
3. Copie o **ID** numérico

### Passo 3: Configurar o .env
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
ALLOWED_TELEGRAM_IDS=123456789
SECRET_KEY=uma-senha-forte-e-unica-aqui
BACKEND_PUBLIC_URL=https://seu-backend.up.railway.app
TELEGRAM_WEBHOOK_SECRET=um-segredo-opcional
```

---

## 📱 Como Usar

### Via Telegram (registrar transações)

```
+150 salário              → Receita de R$150
-45.90 mercado            → Despesa de R$45.90
-25 uber transporte       → Despesa com categoria auto
+1000,50 freelance        → Receita de R$1000.50
```

**Comandos disponíveis:**
- `/resumo` — Resumo do mês
- `/saldo` — Saldo total
- `/categorias` — Lista categorias
- `/ultimas` — Últimas 10 transações
- `/ajuda` — Ajuda

### Via Dashboard Web

1. Acesse **http://localhost:3000**
2. Crie uma conta (informe seu Telegram ID para vincular)
3. Visualize gráficos, transações e resumos
4. Adicione transações manualmente pelo botão "+"

---

## 📂 Categorias Automáticas

O bot categoriza automaticamente baseado em palavras-chave:

| Categoria      | Palavras-chave                                        |
|----------------|-------------------------------------------------------|
| 🍔 Alimentação | mercado, restaurante, ifood, padaria, lanche...       |
| 🚗 Transporte  | uber, 99, gasolina, ônibus, estacionamento...         |
| 🏠 Moradia     | aluguel, luz, água, internet, condomínio...           |
| 💊 Saúde       | farmácia, médico, remédio, academia...                |
| 🎓 Educação    | curso, livro, escola, faculdade...                    |
| 🎮 Lazer       | cinema, netflix, spotify, viagem, bar...              |
| 👔 Vestuário   | roupa, calçado, tênis, camisa...                      |
| 💰 Renda       | salário, freelance, bônus, pix...                     |
| 📈 Investimento| dividendo, rendimento, poupança, ações...             |
| 📦 Outros      | (quando não encontra categoria)                       |

---

## 🔐 Segurança

- ✅ Senhas hasheadas com **bcrypt**
- ✅ Autenticação via **JWT** com expiração de 7 dias
- ✅ Bot responde apenas para IDs autorizados
- ✅ CORS configurável
- ✅ Dados isolados por usuário

---

## 📱 PWA (Usar como App)

O dashboard funciona como PWA. Para instalar no celular:

1. Acesse o dashboard pelo Chrome
2. Toque nos **3 pontinhos** (⋮)
3. Selecione **"Instalar app"** ou **"Adicionar à tela inicial"**
4. Pronto! Funciona como um app nativo

---

## 🚀 Deploy (Gratuito)

### Backend — Railway ou Render
1. Faça push do código no GitHub
2. Conecte o repositório no [Railway](https://railway.app) ou [Render](https://render.com)
3. Configure as variáveis de ambiente
4. Deploy automático!

### Frontend — Vercel
1. Conecte o repositório na [Vercel](https://vercel.com)
2. Defina o root directory como `frontend`
3. Configure `NEXT_PUBLIC_API_URL` com a URL do backend
4. Deploy automático!

---

## 📁 Estrutura do Projeto

```
finança/
├── backend/
│   ├── main.py           # API FastAPI (endpoints)
│   ├── bot.py            # Bot do Telegram
│   ├── models.py         # Modelos do banco (User, Category, Transaction)
│   ├── schemas.py        # Schemas Pydantic (validação)
│   ├── auth.py           # Autenticação JWT
│   ├── database.py       # Configuração do banco
│   ├── config.py         # Variáveis de ambiente
│   ├── requirements.txt  # Dependências Python
│   └── .env.example      # Template de configuração
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Layout raiz
│   │   │   ├── page.tsx          # Redirect inicial
│   │   │   ├── globals.css       # Estilos globais
│   │   │   ├── login/page.tsx    # Página de login
│   │   │   └── dashboard/page.tsx # Dashboard principal
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Menu lateral
│   │   │   ├── SummaryCards.tsx   # Cards de resumo
│   │   │   ├── Charts.tsx        # Gráficos (pizza + barras)
│   │   │   └── TransactionList.tsx # Lista de transações
│   │   └── lib/
│   │       └── api.ts            # Cliente HTTP
│   ├── public/
│   │   └── manifest.json         # Config PWA
│   ├── package.json
│   └── tailwind.config.ts
│
└── README.md
```
