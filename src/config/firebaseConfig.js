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
                // Parse do JSON
                const rawServiceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
                
                // CORREÇÃO: Processar a private key para converter \n em quebras de linha reais
                if (rawServiceAccount.private_key) {
                    rawServiceAccount.private_key = rawServiceAccount.private_key.replace(/\\n/g, '\n');
                }
                
                serviceAccount = rawServiceAccount;
                initMethod = 'variável de ambiente JSON (com correção de private key)';
                
                console.log('🔑 Private key processada com sucesso');
                
            } catch (parseError) {
                console.error('❌ Erro ao fazer parse do JSON do Firebase:', parseError.message);
                
                // Debug: mostrar primeiros caracteres
                const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
                console.error('🔍 Primeiros 100 chars do JSON:', jsonStr?.substring(0, 100));
                console.error('🔍 Últimos 100 chars do JSON:', jsonStr?.substring(jsonStr.length - 100));
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
                    
                    // Mesma correção para arquivo
                    if (rawServiceAccount.private_key) {
                        rawServiceAccount.private_key = rawServiceAccount.private_key.replace(/\\n/g, '\n');
                    }
                    
                    serviceAccount = rawServiceAccount;
                    initMethod = 'arquivo JSON (com correção de private key)';
                } catch (fileError) {
                    console.error('❌ Erro ao processar arquivo JSON:', fileError.message);
                }
            }
        }
        
        // Método 3: Variáveis individuais (último recurso)
        if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            console.log('🔑 Carregando Firebase via variáveis individuais');
            
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;
            
            // Processar private key baseado no formato
            if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
                // Se estiver em base64, decodificar
                privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
            } else {
                // Processar escape de \n
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
            initMethod = 'variáveis individuais (com correção de private key)';
        }

        if (serviceAccount) {
            // Verificar se a private key parece válida
            if (serviceAccount.private_key && !serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
                console.warn('⚠️ Private key pode estar corrompida - não contém "BEGIN PRIVATE KEY"');
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
        
        // Se for erro de private key inválida, dar dica específica
        if (error.message.includes('Invalid PEM') || error.message.includes('Failed to parse private key')) {
            console.error('💡 Dica: Problema comum com private key. Verifique se:');
            console.error('   1. A private key não tem \\n extras no final');
            console.error('   2. O JSON está formatado corretamente');
            console.error('   3. Não há caracteres especiais corrompidos');
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