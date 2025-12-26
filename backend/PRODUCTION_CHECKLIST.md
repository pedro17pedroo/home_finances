# Checklist de Produção - FinanceControl Backend

## ✅ Pré-requisitos

### 1. Servidor VPS
- [ ] Ubuntu 22.04 LTS ou superior
- [ ] Mínimo 2GB RAM, 2 vCPUs
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL 14+ instalado
- [ ] Nginx instalado (reverse proxy)
- [ ] Certbot instalado (SSL)

### 2. Domínio e DNS
- [ ] Domínio configurado (ex: api.financecontrol.ao)
- [ ] DNS A record apontando para IP do servidor

---

## 🔧 Configuração do Servidor

### Instalar dependências
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 (process manager)
sudo npm install -g pm2

# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### Configurar PostgreSQL
```bash
# Aceder ao PostgreSQL
sudo -u postgres psql

# Criar base de dados e utilizador
CREATE DATABASE financecontrol;
CREATE USER financecontrol_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE financecontrol TO financecontrol_user;
\q
```

### Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/financecontrol-api
```

Conteúdo:
```nginx
server {
    listen 80;
    server_name api.financecontrol.ao;

    location / {
        proxy_pass http://localhost:5001;
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

    # Servir ficheiros estáticos (uploads)
    location /uploads {
        alias /var/www/financecontrol/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/financecontrol-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Configurar SSL
sudo certbot --nginx -d api.financecontrol.ao
```

---

## 📦 Deploy da Aplicação

### 1. Clonar repositório
```bash
cd /var/www
sudo mkdir financecontrol
sudo chown $USER:$USER financecontrol
cd financecontrol
git clone <seu-repositorio> .
cd backend
```

### 2. Instalar dependências
```bash
npm ci --production
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
nano .env
```

**IMPORTANTE - Configurar estas variáveis:**
```env
# Ambiente
NODE_ENV=production
PORT=5001

# Base de dados
DATABASE_URL=postgresql://financecontrol_user:SUA_SENHA@localhost:5432/financecontrol

# Segurança - GERAR NOVOS SECRETS!
JWT_SECRET=<gerar-com-openssl-rand-base64-64>
REFRESH_TOKEN_SECRET=<gerar-com-openssl-rand-base64-64>
SESSION_SECRET=<gerar-com-openssl-rand-base64-64>

# URLs
FRONTEND_URL=https://financecontrol.ao
BACKOFFICE_URL=https://admin.financecontrol.ao
ALLOWED_ORIGINS=https://financecontrol.ao,https://admin.financecontrol.ao

# Email SMTP (produção)
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@financecontrol.ao
SMTP_PASS=sua-senha-smtp
SMTP_FROM=noreply@financecontrol.ao
SMTP_FROM_NAME=FinanceControl

# TPagamento (produção)
TPAGAMENTO_API_URL=https://api.tpagamento.ao/v1
TPAGAMENTO_API_KEY=pk_live_sua_chave_producao
```

**Gerar secrets seguros:**
```bash
openssl rand -base64 64
```

### 4. Build da aplicação
```bash
npm run build
```

### 5. Executar migrations
```bash
npm run db:migrate
```

### 6. Criar admin inicial
```bash
npm run seed:admin
```

### 7. Iniciar com PM2
```bash
pm2 start dist/server.js --name financecontrol-api
pm2 save
pm2 startup
```

---

## 🔒 Segurança

### Checklist de Segurança
- [ ] Firewall configurado (UFW)
- [ ] Apenas portas 22, 80, 443 abertas
- [ ] SSH com chave (desativar password)
- [ ] Fail2ban instalado
- [ ] Secrets únicos e fortes
- [ ] HTTPS obrigatório
- [ ] Headers de segurança no Nginx

### Configurar Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Instalar Fail2ban
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

---

## 📊 Monitorização

### Logs
```bash
# Ver logs da aplicação
pm2 logs financecontrol-api

# Ver logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Comandos PM2 úteis
```bash
pm2 status              # Ver estado
pm2 restart all         # Reiniciar
pm2 reload all          # Reload sem downtime
pm2 monit               # Monitor em tempo real
```

---

## 🔄 Atualizações

### Script de deploy
```bash
cd /var/www/financecontrol/backend
git pull origin main
npm ci --production
npm run build
pm2 reload financecontrol-api
```

---

## ⚠️ Problemas Comuns

### Erro de permissões nos uploads
```bash
sudo chown -R www-data:www-data /var/www/financecontrol/backend/uploads
sudo chmod -R 755 /var/www/financecontrol/backend/uploads
```

### Erro de conexão à base de dados
- Verificar se PostgreSQL está a correr: `sudo systemctl status postgresql`
- Verificar credenciais no .env
- Verificar se o utilizador tem permissões

### Erro 502 Bad Gateway
- Verificar se a aplicação está a correr: `pm2 status`
- Verificar logs: `pm2 logs financecontrol-api`
