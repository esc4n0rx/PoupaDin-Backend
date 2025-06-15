# Dockerfile
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Criar diretório da aplicação
WORKDIR /usr/src/app

# Copiar arquivos de dependências
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Instalar dependências
RUN pnpm install --frozen-lockfile --prod

# Copiar código fonte
COPY . .

# Criar diretório para credenciais Firebase
RUN mkdir -p /usr/src/app/config/firebase

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "server.js"]