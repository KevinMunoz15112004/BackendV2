// Requerir los módulos
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import superAdminRoutes from './routers/superAdminRoutes.js'
import estudiantesRoutes from './routers/estudiantesRoutes.js'

// Inicializaciones
const app = express()
dotenv.config()

// Configuraciones 
app.set('port',process.env.PORT || 3000)
app.use(cors())

// Middlewares 
app.use(express.json())

// Gestión del super admin
app.use('/api', superAdminRoutes)

// Rutas para estudiantes
app.use('/api', estudiantesRoutes)

// Manejo de rutas no existentens
app.use((req, res) => {res.status(404).json({error: "Ruta no encontrada"})})

// Rutas 
app.get('/',(req,res)=>{
    res.send("Server on")
})

// Exportar la instancia de express por medio de app
export default app