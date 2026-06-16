import Estudiante from '../../models/Estudiantes.js'
import SuperAdmin from '../../models/SuperAdmin.js'
import bcrypt from 'bcryptjs'

// Datos de prueba

export const SUPER_ADMIN_TEST = {
  nombre: 'Super',
  apellido: 'Admin',
  email: 'superadmin@test.com',
  password: 'Password123*'
}

export const ESTUDIANTE_B_TEST = {
  nombre: 'Estudiante',
  apellido: 'Beta',
  email: 'estudianteb@test.com',
  password: 'Password123*'
}

export const ESTUDIANTE_C_TEST = {
  nombre: 'Estudiante',
  apellido: 'Cruz',
  email: 'estudiantec@test.com',
  password: 'Password123*'
}

export const RED_TEST = {
  nombre: 'Red de prueba',
  descripcion: 'Descripción de prueba',
  proposito: 'Propósito de prueba'
}

export const PUBLICACION_TEST = {
  titulo: 'Publicación de prueba',
  contenido: 'Contenido de prueba',
  categoria: 'comunidad',
  tipoContenido: 'texto',
  feedContext: 'home'
}

// Seeders

export const crearSuperAdmin = async () => {
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_TEST.password, 10)
  const superAdmin = await SuperAdmin.create({
    nombre: SUPER_ADMIN_TEST.nombre,
    apellido: SUPER_ADMIN_TEST.apellido,
    email: SUPER_ADMIN_TEST.email,
    password: passwordHash,
    confirmEmail: true
  })
  return superAdmin
}

export const crearEstudiante = async (datos) => {
  const passwordHash = await bcrypt.hash(datos.password, 10)
  const estudiante = await Estudiante.create({
    nombre: datos.nombre,
    apellido: datos.apellido,
    email: datos.email,
    password: passwordHash,
    confirmEmail: true,
    perfilCompleto: false,
    roles: ['estudiante']
  })
  return estudiante
}

export const crearEstudianteConPerfil = async (datos) => {
  const passwordHash = await bcrypt.hash(datos.password, 10)
  const estudiante = await Estudiante.create({
    nombre: datos.nombre,
    apellido: datos.apellido,
    email: datos.email,
    password: passwordHash,
    confirmEmail: true,
    perfilCompleto: true,
    username: `${datos.nombre.toLowerCase()}${Math.floor(Math.random() * 10000)}`,
    roles: ['estudiante']
  })
  return estudiante
}