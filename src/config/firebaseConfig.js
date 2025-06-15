// src/config/firebaseConfig.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseApp;

const initializeFirebase = () => {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        const credentialPath = process.env.FIREBASE_CREDENTIAL_PATH;
        
        if (credentialPath && fs.existsSync(credentialPath)) {
            console.log('🔥 Carregando Firebase via arquivo JSON...');
            const serviceAccount = require(credentialPath);
            
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID
            });
            
            console.log('✅ Firebase Admin inicializado via arquivo JSON');
        } else {
            console.warn('⚠️ Arquivo de credenciais Firebase não encontrado');
            console.warn(`Caminho procurado: ${credentialPath}`);
            return null;
        }

        return firebaseApp;
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
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
