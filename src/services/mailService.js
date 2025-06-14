// src/services/mailService.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Serviço de Email usando Resend
 * Envia emails de recuperação de senha com código de 6 dígitos
 */
const sendPasswordResetEmail = async (email, resetCode) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY não está configurada');
    }

    if (!process.env.FROM_EMAIL) {
        throw new Error('FROM_EMAIL não está configurada');
    }

    const emailTemplate = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperação de Senha - PoupaDin</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    line-height: 1.6;
                    color: #333333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8fafc;
                }
                .container {
                    background-color: #ffffff;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .header {
                    text-align: center;
                    margin-bottom: 32px;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    color: #10b981;
                    margin-bottom: 8px;
                }
                .title {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 16px;
                }
                .code-container {
                    background-color: #f3f4f6;
                    border: 2px dashed #10b981;
                    border-radius: 8px;
                    padding: 24px;
                    text-align: center;
                    margin: 24px 0;
                }
                .reset-code {
                    font-size: 36px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #10b981;
                    font-family: 'Courier New', monospace;
                }
                .instructions {
                    background-color: #eff6ff;
                    border-left: 4px solid #3b82f6;
                    padding: 16px;
                    margin: 24px 0;
                    border-radius: 0 8px 8px 0;
                }
                .warning {
                    background-color: #fef3cd;
                    border-left: 4px solid #f59e0b;
                    padding: 16px;
                    margin: 24px 0;
                    border-radius: 0 8px 8px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 32px;
                    padding-top: 24px;
                    border-top: 1px solid #e5e7eb;
                    color: #6b7280;
                    font-size: 14px;
                }
                .support {
                    margin-top: 24px;
                    padding: 16px;
                    background-color: #f9fafb;
                    border-radius: 8px;
                    text-align: center;
                }
                @media (max-width: 480px) {
                    body { padding: 10px; }
                    .container { padding: 24px; }
                    .reset-code { font-size: 28px; letter-spacing: 4px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">💰 PoupaDin</div>
                    <h1 class="title">Recuperação de Senha</h1>
                </div>

                <p>Olá! 👋</p>
                
                <p>Você solicitou a redefinição da sua senha no <strong>PoupaDin</strong>. Use o código abaixo para criar uma nova senha:</p>

                <div class="code-container">
                    <div class="reset-code">${resetCode}</div>
                </div>

                <div class="instructions">
                    <h3 style="margin-top: 0; color: #1e40af;">📋 Como usar o código:</h3>
                    <ol style="margin-bottom: 0;">
                        <li>Volte para o aplicativo PoupaDin</li>
                        <li>Digite o código de 6 dígitos acima</li>
                        <li>Crie sua nova senha</li>
                        <li>Faça login com suas novas credenciais</li>
                    </ol>
                </div>

                <div class="warning">
                    <h3 style="margin-top: 0; color: #92400e;">⚠️ Importante:</h3>
                    <ul style="margin-bottom: 0;">
                        <li><strong>Este código expira em 15 minutos</strong></li>
                        <li>Use apenas uma vez</li>
                        <li>Não compartilhe este código com ninguém</li>
                        <li>Se você não solicitou esta alteração, ignore este email</li>
                    </ul>
                </div>

                <div class="support">
                    <p style="margin: 0;"><strong>Precisa de ajuda?</strong></p>
                    <p style="margin: 8px 0 0 0;">Se você não conseguir redefinir sua senha ou tiver dúvidas sobre sua conta, entre em contato conosco.</p>
                </div>

                <div class="footer">
                    <p>Este email foi enviado automaticamente pelo sistema PoupaDin.</p>
                    <p>Por favor, não responda a este email.</p>
                    <p style="margin-top: 16px;">
                        <strong>PoupaDin</strong> - Seu controle financeiro pessoal<br>
                        © ${new Date().getFullYear()} Todos os direitos reservados.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.FROM_EMAIL,
            to: [email],
            subject: `🔐 Código de Recuperação de Senha - PoupaDin`,
            html: emailTemplate,
        });

        if (error) {
            console.error('Erro ao enviar email via Resend:', error);
            throw new Error('Falha ao enviar email de recuperação');
        }

        console.log('✅ Email de recuperação enviado com sucesso:', {
            id: data.id,
            to: email
        });

        return data;
    } catch (error) {
        console.error('💥 Erro crítico no envio de email:', error);
        throw error;
    }
};

module.exports = { sendPasswordResetEmail };