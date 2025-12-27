# Guia de Deploy para Produção - FinanceControl

## 📋 Visão Geral

Este guia cobre o deploy completo do sistema FinanceControl numa VPS:
- **Backend API** (Node.js + PostgreSQL) - porta 4005
- **Frontend** (React SPA) - servido via Nginx
- **Backoffice** (React SPA) - servido via Nginx

## 🖥️ Requisitos do Servidor

### Hardware Mínimo
- 2 vCPUs
- 4GB RAM
- 40GB SSD
- Ubuntu 22.04 LTS

### Software
- Node.js 20+
- PostgreSQL 14+
- Nginx
- PM2
- Certbot (SSL)

---

## 🔧 Configuração Inicial do Servidor

### 1. Atualizar Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Deve mostrar v20.x
```

### 3. Instalar PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 4. Instalar Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 5. Instalar PM2
```bash
sudo npm install -g pm2
```

### 6. Instalar Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 🗄️ Configurar Base de Dados

```bash
sudo -u postgres psql
```

```sql
-- Criar base de dados
CREATE DATABASE financecontrol;

-- Criar utilizador
CREATE USER financecontrol_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE';

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE financecontrol TO financecontrol_user;
ALTER DATABASE financecontrol OWNER TO financecontrol_user;

-- Sair
\q
```

---

## 📁 Estrutura de Diretórios

```bash
sudo mkdir -p /var/www/financecontrol
sudo chown -R $USER:$USER /var/www/financecontrol
cd /var/www/financecontrol
```

Estrutura final:
```
/var/www/financecontrol/
├── backend/          # API Node.js
├── frontend/         # App principal (dist)
├── backoffice/       # Painel admin (dist)
└── uploads/          # Ficheiros enviados
```

---

## 🚀 Deploy do Backend

### 1. Clonar e Preparar
```bash
cd /var/www/financecontrol
git clone <seu-repositorio> .
cd backend
npm ci --production
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
nano .env
```

**Configurações obrigatórias para produção:**
```env
NODE_ENV=production
PORT=4005

# Base de dados
DATABASE_URL=postgresql://financecontrol_user:SUA_SENHA@localhost:5432/financecontrol

# Segurança - GERAR NOVOS!
JWT_SECRET=<openssl rand -base64 64>
REFRESH_TOKEN_SECRET=<openssl rand -base64 64>
SESSION_SECRET=<openssl rand -base64 64>

# URLs
FRONTEND_URL=https://financecontrol.ao
BACKOFFICE_URL=https://admin.financecontrol.ao
ALLOWED_ORIGINS=https://financecontrol.ao,https://admin.financecontrol.ao

# Email SMTP
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@financecontrol.ao
SMTP_PASS=sua-senha
SMTP_FROM=noreply@financecontrol.ao
SMTP_FROM_NAME=FinanceControl

# TPagamento
TPAGAMENTO_API_URL=https://api.tpagamento.ao/v1
TPAGAMENTO_API_KEY=pk_live_sua_chave
```

### 3. Build e Migrations
```bash
npm run build
npm run db:migrate
```

### 4. Iniciar com PM2
```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

---

## 🌐 Deploy do Frontend

### 1. Build Local ou no Servidor
```bash
cd /var/www/financecontrol/frontend
```

Criar `.env` de produção:
```bash
echo "VITE_API_URL=https://api.financecontrol.ao/api" > .env
```

Build:
```bash
npm ci
npm run build
```

Os ficheiros estarão em `frontend/dist/`

---

## 🔐 Deploy do Backoffice

### 1. Build
```bash
cd /var/www/financecontrol/backoffice
```

Criar `.env` de produção:
```bash
echo "VITE_API_URL=https://api.financecontrol.ao/api" > .env
```

Build:
```bash
npm ci
npm run build
```

Os ficheiros estarão em `backoffice/dist/`

---

## 🔒 Configurar Nginx

### 1. Backend API
```bash
sudo nano /etc/nginx/sites-available/api.financecontrol.ao
```

```nginx
server {
    listen 80;
    server_name api.financecontrol.ao;

    location / {
        proxy_pass http://localhost:4005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }

    location /uploads {
        alias /var/www/financecontrol/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Frontend
```bash
sudo nano /etc/nginx/sites-available/financecontrol.ao
```

```nginx
server {
    listen 80;
    server_name financecontrol.ao www.financecontrol.ao;
    root /var/www/financecontrol/frontend/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Cache de assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA - redirecionar todas as rotas para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 3. Backoffice
```bash
sudo nano /etc/nginx/sites-available/admin.financecontrol.ao
```

```nginx
server {
    listen 80;
    server_name admin.financecontrol.ao;
    root /var/www/financecontrol/backoffice/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Cache de assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA - redirecionar todas as rotas para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Ativar Sites
```bash
sudo ln -s /etc/nginx/sites-available/api.financecontrol.ao /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/financecontrol.ao /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.financecontrol.ao /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl reload nginx
```

### 5. Configurar SSL
```bash
sudo certbot --nginx -d api.financecontrol.ao
sudo certbot --nginx -d financecontrol.ao -d www.financecontrol.ao
sudo certbot --nginx -d admin.financecontrol.ao
```

---

## 🔥 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 📊 Monitorização

### Logs do Backend
```bash
pm2 logs financecontrol-api
pm2 monit
```

### Logs do Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Status dos Serviços
```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

---

## 🔄 Script de Atualização

Criar `/var/www/financecontrol/deploy.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Iniciando deploy..."

cd /var/www/financecontrol

# Pull das alterações
git pull origin main

# Backend
echo "📦 Atualizando backend..."
cd backend
npm ci --production
npm run build
npm run db:migrate
pm2 reload financecontrol-api

# Frontend
echo "🌐 Atualizando frontend..."
cd ../frontend
npm ci
npm run build

# Backoffice
echo "🔐 Atualizando backoffice..."
cd ../backoffice
npm ci
npm run build

echo "✅ Deploy concluído!"
```

```bash
chmod +x /var/www/financecontrol/deploy.sh
```

---

## ⚠️ Troubleshooting

### Erro 502 Bad Gateway
```bash
pm2 status
pm2 logs financecontrol-api --lines 50
```

### Erro de Permissões nos Uploads
```bash
sudo chown -R www-data:www-data /var/www/financecontrol/backend/uploads
sudo chmod -R 755 /var/www/financecontrol/backend/uploads
```

### Erro de Conexão à Base de Dados
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"  # Listar bases de dados
```

### Renovar Certificados SSL
```bash
sudo certbot renew --dry-run  # Testar
sudo certbot renew            # Renovar
```

---

## 📱 Configuração Mobile

Para a app mobile, atualizar o ficheiro `mobile/src/constants/config.ts`:
```typescript
export const API_BASE_URL = 'https://api.financecontrol.ao';
```

---

## ✅ Checklist Final

- [ ] PostgreSQL configurado e a correr
- [ ] Backend a correr na porta 4005
- [ ] Frontend build em `/var/www/financecontrol/frontend/dist`
- [ ] Backoffice build em `/var/www/financecontrol/backoffice/dist`
- [ ] Nginx configurado para os 3 domínios
- [ ] SSL ativo em todos os domínios
- [ ] Firewall configurado
- [ ] PM2 configurado para auto-start
- [ ] Variáveis de ambiente de produção configuradas
- [ ] Uploads com permissões corretas
