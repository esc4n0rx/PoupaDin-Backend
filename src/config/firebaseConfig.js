// src/config/firebaseConfig.js
const admin = require('firebase-admin');
const fs = require('fs');

let firebaseApp;

const initializeFirebase = () => {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        console.log('🔥 Inicializando Firebase...');
        
        let serviceAccount = null;
        let initMethod = '';

        // Método 1: JSON via variável de ambiente (principal)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            console.log('📋 Carregando Firebase via variável de ambiente JSON');
            try {
                let jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
                
                // CORREÇÃO: Verificar se está double-escaped e corrigir
                console.log('🔍 Primeiros 50 chars originais:', jsonString.substring(0, 50));
                
                // Se começar com aspas escapadas, provavelmente está double-escaped
                if (jsonString.startsWith('{\\"') || jsonString.includes('\\"')) {
                    console.log('🔧 Detectado double-escape, corrigindo...');
                    // Remover escapes extras
                    jsonString = jsonString.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                    console.log('🔍 Após correção:', jsonString.substring(0, 50));
                }
                
                // Parse do JSON
                const rawServiceAccount = JSON.parse(jsonString);
                
                // Processar a private key para converter \n em quebras de linha reais
                if (rawServiceAccount.private_key) {
                    rawServiceAccount.private_key = rawServiceAccount.private_key.replace(/\\n/g, '\n');
                    console.log('🔑 Private key processada com sucesso');
                }
                
                serviceAccount = rawServiceAccount;
                initMethod = 'variável de ambiente JSON (com correção de double-escape)';
                
            } catch (parseError) {
                console.error('❌ Erro ao fazer parse do JSON do Firebase:', parseError.message);
                
                // Debug detalhado
                const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
                console.error('🔍 Tentando parse direto...');
                console.error('🔍 Tamanho do JSON:', jsonStr?.length);
                console.error('🔍 Primeiro char code:', jsonStr?.charCodeAt(0));
                console.error('🔍 Contém \\":', jsonStr?.includes('\\"'));
                
                // Tentar método alternativo - remover todas as aspas escapadas
                try {
                    console.log('🔧 Tentando método alternativo...');
                    let cleanJson = jsonStr
                        .replace(/\\"/g, '"')  // \" -> "
                        .replace(/\\\\/g, '\\'); // \\ -> \
                    
                    const altServiceAccount = JSON.parse(cleanJson);
                    if (altServiceAccount.private_key) {
                        altServiceAccount.private_key = altServiceAccount.private_key.replace(/\\n/g, '\n');
                    }
                    serviceAccount = altServiceAccount;
                    initMethod = 'método alternativo de parse';
                    console.log('✅ Método alternativo funcionou!');
                } catch (altError) {
                    console.error('❌ Método alternativo também falhou:', altError.message);
                }
            }
        }
        
        // Método 2: Arquivo JSON via path (fallback)
        if (!serviceAccount) {
            const credentialPath = process.env.FIREBASE_CREDENTIAL_PATH;
            if (credentialPath && fs.existsSync(credentialPath)) {
                console.log(`📁 Tentando carregar Firebase via arquivo: ${credentialPath}`);
                try {
                    const fileContent = fs.readFileSync(credentialPath, 'utf8');
                    const rawServiceAccount = JSON.parse(fileContent);
                    
                    if (rawServiceAccount.private_key) {
                        rawServiceAccount.private_key = rawServiceAccount.private_key.replace(/\\n/g, '\n');
                    }
                    
                    serviceAccount = rawServiceAccount;
                    initMethod = 'arquivo JSON';
                } catch (fileError) {
                    console.error('❌ Erro ao processar arquivo JSON:', fileError.message);
                }
            }
        }
        
        // Método 3: Variáveis individuais (último recurso)
        if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            console.log('🔑 Carregando Firebase via variáveis individuais');
            
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;
            
            if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
                privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
            } else {
                privateKey = privateKey.replace(/\\n/g, '\n');
            }
            
            serviceAccount = {
                type: "service_account",
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: privateKey,
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
            };
            initMethod = 'variáveis individuais';
        }

        if (serviceAccount) {
            // Verificar se a private key parece válida
            if (serviceAccount.private_key && !serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
                console.warn('⚠️ Private key pode estar corrompida - não contém "BEGIN PRIVATE KEY"');
                console.warn('🔍 Primeiros 100 chars da private key:', serviceAccount.private_key.substring(0, 100));
            }
            
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
            });
            
            console.log(`✅ Firebase Admin inicializado via ${initMethod}`);
        } else {
            console.warn('⚠️ Firebase não configurado - nenhuma credencial válida encontrada');
            return null;
        }

        return firebaseApp;
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error.message);
        
        if (error.message.includes('Invalid PEM') || error.message.includes('Failed to parse private key')) {
            console.error('💡 Dica: Problema com private key. Possíveis soluções:');
            console.error('   1. JSON pode estar double-escaped pelo Coolify');
            console.error('   2. Private key pode ter caracteres corrompidos');
            console.error('   3. Tente usar variáveis individuais em vez do JSON completo');
        }
        
        return null;
    }
};

const getFirebaseApp = () => {
    return firebaseApp || initializeFirebase();
};

const getMessaging = () => {
    const app = getFirebaseApp();
    return app ? admin.messaging(app) : null;
};

module.exports = {
    initializeFirebase,
    getFirebaseApp,
    getMessaging
};