require('dotenv').config();

console.log('🔍 Verificando configuração do Cloudinary...\n');

console.log('Variáveis de ambiente:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Definida' : '❌ Não definida');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Definida' : '❌ Não definida');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Definida' : '❌ Não definida');

console.log('\nValores (parciais para segurança):');
console.log('CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API_KEY:', process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.substring(0, 6) + '...' : 'undefined');
console.log('API_SECRET:', process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.substring(0, 6) + '...' : 'undefined');

// Testar Cloudinary diretamente
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

console.log('\n🧪 Testando conexão com Cloudinary...');

cloudinary.api.ping()
    .then(result => {
        console.log('✅ Cloudinary conectado com sucesso!');
        console.log('Resultado:', result);
    })
    .catch(error => {
        console.log('❌ Erro na conexão:');
        console.log('Tipo:', error.constructor.name);
        console.log('Mensagem:', error.message);
        console.log('Código:', error.http_code);
        console.log('Error completo:', error);
    });