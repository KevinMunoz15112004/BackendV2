import { Router } from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import { verificarEstadoLogin } from '../middlewares/verificarLogin.js'
import Estudiante from '../models/Estudiantes.js'

const loginRouter = Router()

loginRouter.get('/microsoft', verificarEstadoLogin, passport.authenticate('auth-microsoft', {
    prompt: "select_account",
    session: false,
}))

loginRouter.get('/microsoft/callback',
  passport.authenticate('auth-microsoft', { failureRedirect: "/auth/microsoft", session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      let estudianteBDD = await Estudiante.findOne({ email: user.emails?.[0]?.value || user._json.mail });

      if (!estudianteBDD) {
        estudianteBDD = new Estudiante({
          nombre: user.name?.givenName || user._json.givenName,
          apellido: user.name?.familyName || user._json.surname,
          email: user.emails?.[0]?.value || user._json.mail,
          rol: "Estudiante",
          authMicrosoft: true
        });
        await estudianteBDD.save();
      }

      const token = jwt.sign(
        {
          id: estudianteBDD._id.toString(),
          rol: "Estudiante",
          displayName: user.displayName,
          email: estudianteBDD.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.send(`<!DOCTYPE html>
        <html lang="en">
        <body></body>
        <script>
          window.opener.postMessage({
            token: "${token}",
            user: {
              id: "${estudianteBDD._id}",
              displayName: "${user.displayName}",
              email: "${estudianteBDD.email}",
              rol: "Estudiante",
              name: {
                givenName: "${user.name?.givenName || user._json.givenName}",
                familyName: "${user.name?.familyName || user._json.surname}"
              }
            }
          }, "${process.env.FRONTEND_URL}");
          window.close();
        </script>
        </html>`);

    } catch (error) {
      console.error('Error en callback Microsoft:', error);
      res.status(500).send("Error interno en autenticación Microsoft");
    }
  }
);

export { loginRouter };
