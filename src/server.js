// Requerir los módulos
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import superAdminRoutes from './routers/superAdminRoutes.js'
import estudiantesRoutes from './routers/estudiantesRoutes.js'
import { loginRouter } from './routers/microsoftRoutes.js'
import cloudinary from 'cloudinary'
import fileUpload from "express-fileupload"
import passport from 'passport'
import chatRoutes from './routers/chatRoutes.js'
import mensajesRoutes from './routers/mensajesRoutes.js'
import { configurarSocket } from './socket.js'
import http from 'http';
import './middlewares/microsoftMiddleware.js'
import adminRedes from './routers/adminRedRoutes.js'


// Inicializaciones
const app = express()
dotenv.config()

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : './uploads'
}))

// Configuraciones 
app.set('port',process.env.PORT || 3000)
app.use(cors())

// Middlewares 
app.use(express.json())

// Chat en tiempo real con Socket.io
const server = http.createServer(app)
configurarSocket(server)

// Gestión del super admin
app.use('/api', superAdminRoutes)

// Rutas para el admin de red
app.use('/api', adminRedes)

// Rutas para estudiantes
app.use('/api', estudiantesRoutes)

// Ruta para el chatbot
app.use('/api', chatRoutes)

// Ruta para obtener los mensajes
app.use('/api', mensajesRoutes)

// Login con microsoft
app.use(passport.initialize())
app.use('/auth', loginRouter)

// Rutas 
app.get('/',(req,res)=>{
    res.send("✅ Server On")
})

// Manejo de rutas no existentens
app.use((req, res) => {
    res.status(404).json({error: "Ruta no encontrada"})
})


// Exportar la instancia de express por medio de app
export { app, server }