import passport from "passport"
import { Strategy as MicrosoftStrategy } from 'passport-microsoft'
import { config } from 'dotenv'

passport.use('auth-microsoft', new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_CALLBACK_URL,
    scope: ["https://graph.microsoft.com/User.Read",
            "https://graph.microsoft.com/Calendars.Read",
            "https://graph.microsoft.com/Mail.Read",
            "offline_access"],
    authorizationURL: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenURL: "https://login.microsoftonline.com/common/oauth2/v2.0/token"
}, 
    function(accessToken, refreshToken, profile, done) {
        console.log(accessToken)
        console.log(profile)
        done(null, profile)
    }
))