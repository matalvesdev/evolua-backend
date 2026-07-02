function baseHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Evolua</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:24px 0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
          <tr>
            <td style="background:linear-gradient(135deg,#6C63FF,#4A42D4);padding:32px 40px;text-align:center">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px">Evolua</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;color:#1E1E2C;font-size:16px;line-height:1.6">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e8e8ef;text-align:center">
              <p style="margin:0 0 8px;font-size:13px;color:#8a8aa0">
                Evolua CRM — Fonoaudiologia
              </p>
              <p style="margin:0;font-size:12px;color:#b0b0c4">
                Se precisar de ajuda, responda a este e-mail ou entre em contato pelo WhatsApp.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr>
      <td align="center">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#6C63FF;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E1E2C">Bem-vindo ao Evolua!</h2>
    <p style="margin:0 0 16px">Olá <strong>${name}</strong>,</p>
    <p style="margin:0 0 16px">Sua conta foi criada com sucesso. Estamos muito felizes em ter você a bordo!</p>
    <p style="margin:0 0 16px">Aqui estão alguns passos para começar:</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#1E1E2C">
      <li style="margin-bottom:8px">Complete seu perfil profissional</li>
      <li style="margin-bottom:8px">Configure sua clínica e horários</li>
      <li style="margin-bottom:8px">Adicione seus primeiros pacientes</li>
      <li style="margin-bottom:8px">Explore os recursos de prontuário e evolução</li>
    </ul>
    ${ctaButton('https://app.useevolua.com.br/onboarding', 'Começar agora')}
    <p style="margin:16px 0 0;font-size:14px;color:#8a8aa0">
      Se tiver qualquer dúvida, estamos à disposição.
    </p>
  `;
  return { subject: 'Bem-vindo ao Evolua — sua conta foi criada!', html: baseHtml(body) };
}

export function passwordResetEmail(resetLink: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E1E2C">Redefinição de senha</h2>
    <p style="margin:0 0 16px">Recebemos uma solicitação de redefinição de senha para sua conta.</p>
    <p style="margin:0 0 16px">Clique no botão abaixo para criar uma nova senha:</p>
    ${ctaButton(resetLink, 'Redefinir senha')}
    <p style="margin:16px 0 0;font-size:14px;color:#8a8aa0">
      Se você não solicitou esta alteração, ignore este e-mail. O link expira em 1 hora.
    </p>
  `;
  return { subject: 'Redefinição de senha — Evolua', html: baseHtml(body) };
}

export function appointmentReminder24h(patientName: string, date: string, time: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E1E2C">Lembrete de consulta</h2>
    <p style="margin:0 0 16px">Olá <strong>${patientName}</strong>,</p>
    <p style="margin:0 0 16px">Passando para lembrar que você tem uma consulta agendada amanhã:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#f8f8ff;border-radius:8px;padding:16px 20px;width:100%">
      <tr>
        <td style="font-size:15px;color:#1E1E2C">
          <strong>Data:</strong> ${date}<br />
          <strong>Horário:</strong> ${time}
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#8a8aa0">
      Caso precise remarcar ou cancelar, entre em contato conosco com antecedência.
    </p>
  `;
  return { subject: `Lembrete: consulta amanhã às ${time} — Evolua`, html: baseHtml(body) };
}

export function appointmentReminder1h(patientName: string, date: string, time: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E1E2C">Consulta em 1 hora!</h2>
    <p style="margin:0 0 16px">Olá <strong>${patientName}</strong>,</p>
    <p style="margin:0 0 16px">Sua consulta de hoje está chegando:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#f8f8ff;border-radius:8px;padding:16px 20px;width:100%">
      <tr>
        <td style="font-size:15px;color:#1E1E2C">
          <strong>Data:</strong> ${date}<br />
          <strong>Horário:</strong> ${time}
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#8a8aa0">
      Não se atrase! Se houver imprevistos, avise-nos o quanto antes.
    </p>
  `;
  return { subject: `⏰ Consulta em 1 hora: ${time} — Evolua`, html: baseHtml(body) };
}

export function billingReceipt(patientName: string, amount: string, date: string, paymentMethod: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E1E2C">Comprovante de pagamento</h2>
    <p style="margin:0 0 16px">Olá <strong>${patientName}</strong>,</p>
    <p style="margin:0 0 16px">Seu pagamento foi confirmado. Seguem os detalhes:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#f8f8ff;border-radius:8px;padding:16px 20px;width:100%">
      <tr>
        <td style="font-size:15px;color:#1E1E2C">
          <strong>Valor:</strong> R$ ${amount}<br />
          <strong>Data:</strong> ${date}<br />
          <strong>Forma de pagamento:</strong> ${paymentMethod}
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#8a8aa0">
      Este e-mail serve como comprovante. Guarde-o para seus registros.
    </p>
  `;
  return { subject: `Comprovante de pagamento — Evolua`, html: baseHtml(body) };
}

export function reportReady(patientName: string, reportType: string, reportLink: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E1E2C">Relatório disponível</h2>
    <p style="margin:0 0 16px">Olá <strong>${patientName}</strong>,</p>
    <p style="margin:0 0 16px">Seu relatório de <strong>${reportType}</strong> já está disponível.</p>
    <p style="margin:0 0 16px">Clique no botão abaixo para acessá-lo:</p>
    ${ctaButton(reportLink, 'Acessar relatório')}
    <p style="margin:16px 0 0;font-size:14px;color:#8a8aa0">
      Se tiver dificuldades para visualizar, copie e cole o link no seu navegador.
    </p>
  `;
  return { subject: `Relatório de ${reportType} disponível — Evolua`, html: baseHtml(body) };
}

export function newsletterConfirmation(email: string, confirmLink: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E1E2C">Confirme sua inscrição</h2>
    <p style="margin:0 0 16px">Olá,</p>
    <p style="margin:0 0 16px">Recebemos o cadastro do e-mail <strong>${email}</strong> para receber nossa newsletter.</p>
    <p style="margin:0 0 16px">Para confirmar sua inscrição, clique no botão abaixo:</p>
    ${ctaButton(confirmLink, 'Confirmar inscrição')}
    <p style="margin:16px 0 0;font-size:14px;color:#8a8aa0">
      Se não foi você, ignore este e-mail. Nenhuma mensagem será enviada sem confirmação.
    </p>
  `;
  return { subject: 'Confirme sua inscrição na newsletter — Evolua', html: baseHtml(body) };
}

export function leadMagnetDelivery(recipientName: string, magnetTitle: string, downloadLink: string): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#1E1E2C">Seu material está pronto!</h2>
    <p style="margin:0 0 16px">Olá <strong>${recipientName}</strong>,</p>
    <p style="margin:0 0 16px">Conforme solicitado, o material <strong>"${magnetTitle}"</strong> já está disponível para download.</p>
    ${ctaButton(downloadLink, 'Baixar material')}
    <p style="margin:16px 0 0;font-size:14px;color:#8a8aa0">
      Aproveite e fique de olho no seu e-mail — enviaremos mais conteúdos exclusivos!
    </p>
  `;
  return { subject: `📥 ${magnetTitle} — material disponível para download`, html: baseHtml(body) };
}
