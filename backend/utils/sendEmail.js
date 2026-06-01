const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)

const sendEmail = async (to, otp) => {
  await resend.emails.send({
    from: 'LinkVault <onboarding@resend.dev>',
    to,
    subject: 'Your LinkVault Password Reset OTP',
    htmlContent: `<div style="font-family: sans-serif; max-width: 400px; margin: auto;">
        <h2>Password Reset</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing: 8px; color: #111;">${otp}</h1>
        <p>Expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
      </div>`
  })
}

module.exports = sendEmail