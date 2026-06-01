const nodemailer = require('nodemailer')

const sendEmail = async (to, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })
  const mailOptions = {
    from: `"LinkVault" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your LinkVault Password Reset OTP',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: auto;">
        <h2>Password Reset</h2>
        <p>Your OTP to reset your password is:</p>
        <h1 style="letter-spacing: 8px; color: #111;">${otp}</h1>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `
  }
  await transporter.sendMail(mailOptions)
}

module.exports = sendEmail