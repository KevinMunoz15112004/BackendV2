import { Router } from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import { verificarEstadoLogin } from '../middlewares/verificarLogin.js'

const loginRouter = Router()

loginRouter.get('/microsoft', verificarEstadoLogin, passport.authenticate('auth-microsoft', {
    prompt: "select_account",
    session: false,
}))

loginRouter.get('/microsoft/callback',
    passport.authenticate('auth-microsoft', {
        failureRedirect: "/auth/microsoft",
        session: false
    }),
    (req, res) => {
        const user = req.user;

        const token = jwt.sign(
            { id: user.id, displayName: user.displayName, email: user.emails?.[0]?.value },
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
                                id: "${user.id}",
                                displayName: "${user.displayName}",
                                email: "${user.emails?.[0]?.value || user._json.mail}",
                                name: {
                                    givenName: "${user.name?.givenName || user._json.givenName}",
                                    familyName: "${user.name?.familyName || user._json.surname}"
                                }
                            }
                        }, "${process.env.FRONTEND_URL}");
                        window.close();
                    </script>
                    </html>`);
    }
);

export { loginRouter };
