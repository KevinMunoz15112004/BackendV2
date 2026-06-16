import request from 'supertest'
import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals'
import app from '../../server.js'
import { connectDB, clearDB, closeDB } from '../helpers/setupDB.js'
import {
  crearSuperAdmin,
  crearEstudianteConPerfil,
  SUPER_ADMIN_TEST,
  ESTUDIANTE_B_TEST
} from '../helpers/seeders.js'

//Setup

beforeAll(async () => await connectDB())
afterEach(async () => await clearDB())
afterAll(async () => await closeDB())

// POST /api/login — SuperAdmin 

describe('POST /api/login - SuperAdmin', () => {

  it('debe retornar 200 y token con credenciales correctas', async () => {
    await crearSuperAdmin()

    const res = await request(app)
      .post('/api/login')
      .send({
        email: SUPER_ADMIN_TEST.email,
        password: SUPER_ADMIN_TEST.password
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body).toHaveProperty('rol', 'SuperAdmin')
    expect(res.body).toHaveProperty('nombre', SUPER_ADMIN_TEST.nombre)
    expect(res.body).toHaveProperty('email', SUPER_ADMIN_TEST.email)
  })

  it('debe retornar 404 si el email no existe', async () => {
    await crearSuperAdmin()

    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'noexiste@test.com',
        password: SUPER_ADMIN_TEST.password
      })

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('msg', 'Lo sentimos, el usuario no se encuentra registrado')
  })

  it('debe retornar 401 si la contraseña es incorrecta', async () => {
    await crearSuperAdmin()

    const res = await request(app)
      .post('/api/login')
      .send({
        email: SUPER_ADMIN_TEST.email,
        password: 'passwordIncorrecta123*'
      })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('msg', 'Lo sentimos, la contraseña no es correcta')
  })

  it('debe retornar 403 si el email no está confirmado', async () => {
    const superAdmin = await crearSuperAdmin()
    superAdmin.confirmEmail = false
    await superAdmin.save()

    const res = await request(app)
      .post('/api/login')
      .send({
        email: SUPER_ADMIN_TEST.email,
        password: SUPER_ADMIN_TEST.password
      })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('msg', 'Lo sentimos, debe verificar su cuenta')
  })

})

// POST /api/auth/login — Estudiante

describe('POST /api/auth/login - Estudiante', () => {

  it('debe retornar 200 y token con credenciales correctas', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: ESTUDIANTE_B_TEST.email,
        password: ESTUDIANTE_B_TEST.password
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.usuario).toHaveProperty('email', ESTUDIANTE_B_TEST.email)
    expect(res.body.usuario).toHaveProperty('roles')
    expect(res.body.usuario.roles).toContain('estudiante')
    expect(res.body.usuario).toHaveProperty('perfilCompleto', true)
  })

  it('debe retornar 404 si el email no existe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'noexiste@test.com',
        password: ESTUDIANTE_B_TEST.password
      })

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('msg', 'Usuario no registrado')
  })

  it('debe retornar 401 si la contraseña es incorrecta', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: ESTUDIANTE_B_TEST.email,
        password: 'passwordIncorrecta123*'
      })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('msg', 'Contraseña incorrecta')
  })

  it('debe retornar 403 si la cuenta está suspendida', async () => {
    const estudiante = await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    estudiante.suspendido = true
    await estudiante.save()

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: ESTUDIANTE_B_TEST.email,
        password: ESTUDIANTE_B_TEST.password
      })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('msg', 'Cuenta suspendida. Apelar suspension: https://polired.vercel.app/apelar')
  })

  it('debe retornar 403 si el email no está confirmado', async () => {
    const estudiante = await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    estudiante.confirmEmail = false
    await estudiante.save()

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: ESTUDIANTE_B_TEST.email,
        password: ESTUDIANTE_B_TEST.password
      })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('msg', 'Confirma tu correo electrónico para iniciar sesión')
  })

  it('debe retornar 403 si el contexto es admin_panel pero no tiene rol admin_red', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: ESTUDIANTE_B_TEST.email,
        password: ESTUDIANTE_B_TEST.password,
        context: 'admin_panel'
      })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('msg', 'Usuario no autorizado para panel administrativo')
  })

})