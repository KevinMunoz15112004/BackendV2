import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import connection from './database.js'
import SuperAdmin from './models/SuperAdmin.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const crearSuperAdmin = async () => {
  try {
    await connection()

    const existe = await SuperAdmin.findOne({ email: 'superAdmin@gmail.com' })
    if (existe) {
      console.log('Ya existe un SuperAdmin con ese correo')
      return
    }

    const superAdmin = new SuperAdmin({
      nombre: 'Super',
      apellido: 'Admin',
      celular: '0987256435',
      email: 'hqf22452@toaik.com',
      password: await new SuperAdmin().encrypPassword('superAdminPoliRed'),
      confirmEmail: true,
      rol: 'SuperAdmin'
    })

    await superAdmin.save()
    console.log('SuperAdmin creado con éxito')
  } catch (error) {
    console.error('Error al crear el SuperAdmin:', error)
  } finally {
    process.exit()
  }
}

crearSuperAdmin()