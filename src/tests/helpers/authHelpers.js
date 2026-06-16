import request from 'supertest'
import app from '../../server.js'
import SuperAdmin from '../../models/SuperAdmin.js'
import Estudiante from '../../models/Estudiantes.js'

// SuperAdmin 

export const loginSuperAdmin = async (email, password) => {
  const res = await request(app)
    .post('/api/login')
    .send({ email, password })
  return res.body.token
}

// Estudiante / Admin Red

export const loginEstudiante = async (email, password) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
  return res.body.token
}

export const loginAdminRed = async (email, password) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password, context: 'admin_panel' })
  return res.body.token
}

// Helpers para obtener datos del usuario autenticado

export const getEstudianteByEmail = async (email) => {
  return await Estudiante.findOne({ email })
}

export const getSuperAdminByEmail = async (email) => {
  return await SuperAdmin.findOne({ email })
}

// Helper para confirmar email sin necesitar enviar un correo real

export const confirmarEmailEstudiante = async (email) => {
  const estudiante = await Estudiante.findOne({ email })
  const token = estudiante.token
  const res = await request(app)
    .get(`/api/confirmar/${token}`)
  return res
}