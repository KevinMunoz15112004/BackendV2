import nodemailer from "nodemailer"
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../../.env') })

let transporter = nodemailer.createTransport({
    service: 'gmail',
    host: process.env.HOST_MAILTRAP,
    port: process.env.PORT_MAILTRAP,
    auth: {
        user: process.env.USER_MAILTRAP,
        pass: process.env.PASS_MAILTRAP,
    }
});

const sendMailToRecoveryPasswordE = async(userMail,token)=>{
    let info = await transporter.sendMail({
    from:'"PoliRed" <polired@policonecta.com>',
    to: userMail,
    subject: "Correo para reestablecer tu contraseña",
    html: `
    <h1>PoliRed</h1>
    <hr>
    <a href=${process.env.FRONTEND_URL}/recuperarpassword-e/${token}>Clic para reestablecer tu contraseña</a>
    <hr>
    <footer>El equipo de PoliRed te da bienvenida.</footer>
    `
    });
    console.log("Mensaje enviado satisfactoriamente: ", info.messageId);
}

const sendMailToRecoveryPassword = async(userMail,token)=>{
    let info = await transporter.sendMail({
    from:'"PoliRed" <polired@policonecta.com>',
    to: userMail,
    subject: "Correo para reestablecer tu contraseña",
    html: `
    <h1>PoliRed</h1>
    <hr>
    <a href=${process.env.FRONTEND_URL}/recuperarpassword/${token}>Clic para reestablecer tu contraseña</a>
    <hr>
    <footer>El equipo de PoliRed te da bienvenida.</footer>
    `
    });
    console.log("Mensaje enviado satisfactoriamente: ", info.messageId);
}

const sendMailToRegister = async (userMail, token) => {

    let mailOptions = {
        from: '"PoliRed" <polired@policonecta.com>',
        to: userMail,
        subject: "PoliRed",
        html: `<p>Hola, haz clic <a href="${process.env.FRONTEND_URL}/confirmar-cuenta/${token}">aquí</a> para confirmar tu cuenta.</p>
        <hr>
        <footer>El equipo de PoliRed te da la más cordial bienvenida.</footer>
        `
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error al enviar correo:", error);
        return reject(error);
      }
      console.log("Mensaje enviado satisfactoriamente:", info.messageId);
      resolve(info);
    })
}

export {
    sendMailToRecoveryPassword,
    sendMailToRecoveryPasswordE,
    sendMailToRegister
}