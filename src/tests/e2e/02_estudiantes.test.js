import request from 'supertest'
import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals'
import app from '../../server.js'
import { connectDB, clearDB, closeDB } from '../helpers/setupDB.js'
import {
  crearSuperAdmin,
  crearEstudiante,
  crearEstudianteConPerfil,
  ESTUDIANTE_B_TEST,
  ESTUDIANTE_C_TEST
} from '../helpers/seeders.js'
import { loginEstudiante } from '../helpers/authHelpers.js'
import Estudiante from '../../models/Estudiantes.js'

// Setup

beforeAll(async () => await connectDB())
afterEach(async () => await clearDB())
afterAll(async () => await closeDB())

// POST /api/registro-estudiantes

describe('POST /api/registro-estudiantes', () => {

  it('debe retornar 201 y crear el estudiante correctamente', async () => {
    const res = await request(app)
      .post('/api/registro-estudiantes')
      .send({
        nombre: ESTUDIANTE_B_TEST.nombre,
        apellido: ESTUDIANTE_B_TEST.apellido,
        email: ESTUDIANTE_B_TEST.email,
        password: ESTUDIANTE_B_TEST.password
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('msg', 'Revisa tu correo electrónico para confirmar tu cuenta')
    expect(res.body.estudiante).toHaveProperty('email', ESTUDIANTE_B_TEST.email)
    expect(res.body.estudiante).toHaveProperty('roles')
    expect(res.body.estudiante.roles).toContain('estudiante')
    expect(res.body.estudiante).toHaveProperty('perfilCompleto', false)

    // Verificar que se guardó en BD
    const estudianteEnBD = await Estudiante.findOne({ email: ESTUDIANTE_B_TEST.email })
    expect(estudianteEnBD).not.toBeNull()
    expect(estudianteEnBD.confirmEmail).toBe(false)
    expect(estudianteEnBD.token).not.toBeNull()
  })

  it('debe retornar 400 si el email ya está registrado', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)

    const res = await request(app)
      .post('/api/registro-estudiantes')
      .send({
        nombre: ESTUDIANTE_B_TEST.nombre,
        apellido: ESTUDIANTE_B_TEST.apellido,
        email: ESTUDIANTE_B_TEST.email,
        password: ESTUDIANTE_B_TEST.password
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('msg', 'Lo sentimos, el email ya se encuentra registrado')
  })

  it('debe retornar 400 si el email pertenece al superadmin', async () => {
    await crearSuperAdmin()

    const res = await request(app)
      .post('/api/registro-estudiantes')
      .send({
        nombre: ESTUDIANTE_B_TEST.nombre,
        apellido: ESTUDIANTE_B_TEST.apellido,
        email: 'superadmin@test.com',
        password: ESTUDIANTE_B_TEST.password
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('msg', 'Lo sentimos, el email ya pertenece al Super Administrador')
  })

  it('debe retornar 400 si faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/api/registro-estudiantes')
      .send({
        email: ESTUDIANTE_B_TEST.email,
        password: ESTUDIANTE_B_TEST.password
        // nombre y apellido ausentes
      })

    expect(res.status).toBe(400)
  })

})

// GET /api/confirmar/:token

describe('GET /api/confirmar/:token', () => {

  it('debe retornar 200 y confirmar el email correctamente', async () => {
    // Registrar estudiante
    await request(app)
      .post('/api/registro-estudiantes')
      .send({
        nombre: ESTUDIANTE_B_TEST.nombre,
        apellido: ESTUDIANTE_B_TEST.apellido,
        email: ESTUDIANTE_B_TEST.email,
        password: ESTUDIANTE_B_TEST.password
      })

    // Obtener token directamente de la BD
    const estudianteEnBD = await Estudiante.findOne({ email: ESTUDIANTE_B_TEST.email })
    const token = estudianteEnBD.token

    const res = await request(app)
      .get(`/api/confirmar/${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('msg', 'Correo confirmado, ya puedes iniciar sesión')

    // Verificar en BD que el token se limpió y confirmEmail es true
    const estudianteConfirmado = await Estudiante.findOne({ email: ESTUDIANTE_B_TEST.email })
    expect(estudianteConfirmado.confirmEmail).toBe(true)
    expect(estudianteConfirmado.token).toBeNull()
  })

  it('debe retornar 404 si el token es inválido', async () => {
    const res = await request(app)
      .get('/api/confirmar/tokeninvalido123')

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('msg', 'Token inválido')
  })

  it('debe retornar 404 si se reutiliza el token tras confirmar la cuenta', async () => {
    // Registrar y confirmar
    await request(app)
      .post('/api/registro-estudiantes')
      .send({
        nombre: ESTUDIANTE_B_TEST.nombre,
        apellido: ESTUDIANTE_B_TEST.apellido,
        email: ESTUDIANTE_B_TEST.email,
        password: ESTUDIANTE_B_TEST.password
      })

    const estudianteEnBD = await Estudiante.findOne({ email: ESTUDIANTE_B_TEST.email })
    const token = estudianteEnBD.token

    // Confirmar primera vez
    await request(app).get(`/api/confirmar/${token}`)

    // Reutilizar el mismo token: ya fue invalidado en BD
    const res = await request(app)
      .get(`/api/confirmar/${token}`)

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('msg', 'Token inválido')
  })

})

// PATCH /api/completar/perfil 

describe('PATCH /api/completar/perfil', () => {

  it('debe retornar 200 y completar el perfil correctamente', async () => {
    // Crear estudiante sin perfil completo
    await crearEstudiante(ESTUDIANTE_B_TEST)
    const token = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const res = await request(app)
      .patch('/api/completar/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'estudianteB',
        biografia: 'Mi biografía de prueba'
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('msg', 'Perfil completado')
    expect(res.body.usuario).toHaveProperty('username', 'estudianteB')
    expect(res.body.usuario).toHaveProperty('perfilCompleto', true)
    expect(res.body.usuario).toHaveProperty('biografia', 'Mi biografía de prueba')

    // Verificar en BD
    const estudianteEnBD = await Estudiante.findOne({ email: ESTUDIANTE_B_TEST.email })
    expect(estudianteEnBD.perfilCompleto).toBe(true)
    expect(estudianteEnBD.username).toBe('estudianteB')
  })

  it('debe retornar 400 si el username ya está en uso', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)
    await crearEstudiante(ESTUDIANTE_B_TEST)
    const token = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    // Usar el username del estudiante C
    const estudianteC = await Estudiante.findOne({ email: ESTUDIANTE_C_TEST.email })

    const res = await request(app)
      .patch('/api/completar/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: estudianteC.username })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('msg', 'El username ya está en uso')
  })

  it('debe retornar 400 si el username tiene menos de 3 caracteres', async () => {
    await crearEstudiante(ESTUDIANTE_B_TEST)
    const token = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const res = await request(app)
      .patch('/api/completar/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'ab' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('msg', 'Username debe tener entre 3 y 20 caracteres')
  })

  it('debe retornar 403 si el perfil ya está completo', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    const token = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const res = await request(app)
      .patch('/api/completar/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'nuevoUsername' })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('msg', 'El perfil ya está completo')
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .patch('/api/completar/perfil')
      .send({ username: 'estudianteB' })

    expect(res.status).toBe(401)
  })

})

// GET /api/perfil-estudiante

describe('GET /api/perfil-estudiante', () => {

  it('debe retornar 200 y los datos del perfil del estudiante autenticado', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    const token = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const res = await request(app)
      .get('/api/perfil-estudiante')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('email', ESTUDIANTE_B_TEST.email)
    expect(res.body).toHaveProperty('publicacionesCount')
    expect(res.body).not.toHaveProperty('token')
    expect(res.body).not.toHaveProperty('confirmEmail')
    expect(res.body).not.toHaveProperty('__v')
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .get('/api/perfil-estudiante')

    expect(res.status).toBe(401)
  })

})