const Brevo = require('@getbrevo/brevo')

const sendEmail = async (to, otp) => {
  const client = Brevo.ApiClient.instance
  const apiKey = client.authentications['api-key']
  apiKey.apiKey = process.env.BREVO_API_KEY

  const transactionalApi = new Brevo.TransactionalEmailsApi()

  await transactionalApi.sendTransacEmail({
    sender: { name: 'LinkVault', email: 'nithinthegreat06@gmail.com' },
    to: [{ email: to }],
    subject: 'Your LinkVault Password Reset OTP',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 400px; margin: auto;">
        <h2>Password Reset</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing: 8px; color: #111;">${otp}</h1>
        <p>Expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `
  })
}

module.exports = sendEmail