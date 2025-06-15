const admin = require('firebase-admin');

// Configurar Firebase Admin
let firebaseApp;

const initializeFirebase = () => {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        if (process.env.FIREBASE_CREDENTIAL_PATH) {
            const serviceAccount = require(process.env.FIREBASE_CREDENTIAL_PATH);
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID
            });
        } 
        else if (process.env.FIREBASE_PRIVATE_KEY) {
            const serviceAccount = {
                type: "service_account",
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY_BASE64 
                ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
                : process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
            };

            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID
            });
        } else {
            console.warn('⚠️ Firebase não configurado. Notificações push não funcionarão.');
            return null;
        }

        console.log('✅ Firebase Admin inicializado com sucesso');
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
