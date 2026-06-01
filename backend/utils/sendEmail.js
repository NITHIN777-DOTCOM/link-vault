const nodemailer = require('nodemailer')

const sendEmail = async (to, otp) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS
    }
  })

  await transporter.sendMail({
    from: '"LinkVault" <your_brevo_email>',
    to,
    subject: 'Your LinkVault Password Reset OTP',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: auto;">
        <h2>Password Reset</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing: 8px; color: #111;">${otp}</h1>
        <p>Expires in <strong>10 minutes</strong>.</p>
      </div>
    `
  })
}

module.exports = sendEmail