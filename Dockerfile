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

# Criar diretório para credenciais Firebase
RUN mkdir -p /usr/src/app/config/firebase

# Copiar código fonte
COPY . .

# Copiar credenciais Firebase (se existir)
COPY config/firebase/firebase-service-account.json /usr/src/app/config/firebase/firebase-service-account.json 2>/dev/null || true

# Definir variável de ambiente para o Firebase
ENV FIREBASE_CREDENTIAL_PATH=/usr/src/app/config/firebase/firebase-service-account.json

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "server.js"]