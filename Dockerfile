FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Definir diretório de trabalho
WORKDIR /usr/src/app

# Copiar e instalar dependências
COPY package*.json ./
RUN npm install --omit=dev

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Comando de inicialização com configuração dinâmica
CMD ["sh", "-c", "\
    echo '🚀 Iniciando PoupaDin Backend...' && \
    mkdir -p /usr/src/app/config/firebase && \
    if [ ! -z \"$FIREBASE_SERVICE_ACCOUNT_JSON\" ]; then \
        echo '🔥 Configurando credenciais Firebase...' && \
        echo \"$FIREBASE_SERVICE_ACCOUNT_JSON\" > /usr/src/app/config/firebase/firebase-service-account.json && \
        chmod 644 /usr/src/app/config/firebase/firebase-service-account.json && \
        export FIREBASE_CREDENTIAL_PATH=/usr/src/app/config/firebase/firebase-service-account.json && \
        echo '✅ Credenciais Firebase configuradas!'; \
    else \
        echo '⚠️ FIREBASE_SERVICE_ACCOUNT_JSON não definida'; \
    fi && \
    node server.js"]