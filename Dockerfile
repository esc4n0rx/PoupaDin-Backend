FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Criar diretório da aplicação
WORKDIR /usr/src/app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências usando npm
RUN npm ci --only=production

# Criar diretório para credenciais Firebase
RUN mkdir -p /usr/src/app/config/firebase

# Copiar código fonte
COPY . .

# Criar script de entrada inline
RUN echo '#!/bin/sh\n\
echo "🚀 Iniciando PoupaDin Backend..."\n\
mkdir -p /usr/src/app/config/firebase\n\
if [ ! -z "$FIREBASE_SERVICE_ACCOUNT_JSON" ]; then\n\
    echo "🔥 Configurando credenciais Firebase..."\n\
    echo "$FIREBASE_SERVICE_ACCOUNT_JSON" > /usr/src/app/config/firebase/firebase-service-account.json\n\
    chmod 644 /usr/src/app/config/firebase/firebase-service-account.json\n\
    export FIREBASE_CREDENTIAL_PATH=/usr/src/app/config/firebase/firebase-service-account.json\n\
    echo "✅ Credenciais Firebase configuradas!"\n\
else\n\
    echo "⚠️ FIREBASE_SERVICE_ACCOUNT_JSON não definida, Firebase será desabilitado"\n\
fi\n\
exec node server.js' > /usr/local/bin/entrypoint.sh

# Tornar script executável
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expor porta
EXPOSE 3000

# Usar script de entrada
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]