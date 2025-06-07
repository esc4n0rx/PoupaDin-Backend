 
/**
 * Servico de Email (Mock)
 * Em um ambiente de producao, isso seria integrado com um servico real
 * como SendGrid, Mailgun, ou Amazon SES usando Nodemailer.
 */
const sendPasswordResetEmail = async (email, token) => {

    const resetLink = `http://localhost:5173/reset-password?token=${token}`; 

    console.log('------------------------------------');
    console.log('📧  Serviço de Email (Simulação) 📧');
    console.log(`Para: ${email}`);
    console.log('Assunto: Redefinição de Senha - PoupaDin');
    console.log('Corpo: Você solicitou a redefinição de senha. Clique no link abaixo para criar uma nova senha:');
    console.log(resetLink);
    console.log('Este link expira em 1 hora.');
    console.log('------------------------------------');

    // Em uma aplicacao real, aqui voce faria a chamada para a API de email.
    // Ex: await transport.sendMail({ from, to, subject, html });
    return Promise.resolve();
};

module.exports = { sendPasswordResetEmail };