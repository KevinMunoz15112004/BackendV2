import request from 'supertest'
import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals'
import app from '../../server.js'
import { connectDB, clearDB, closeDB } from '../helpers/setupDB.js'
import {
  crearSuperAdmin,
  crearEstudianteConPerfil,
  SUPER_ADMIN_TEST,
  ESTUDIANTE_C_TEST,
  RED_TEST
} from '../helpers/seeders.js'
import { loginSuperAdmin, loginEstudiante, loginAdminRed } from '../helpers/authHelpers.js'
import Estudiante from '../../models/Estudiantes.js'
import RedComunitaria from '../../models/RedComunitaria.js'

// Setup
beforeAll(async () => await connectDB())
afterEach(async () => await clearDB())
afterAll(async () => await closeDB())

// POST /api/redes/solicitar-creacion
describe('POST /api/redes/solicitar-creacion', () => {

  it('debe retornar 201 y crear la solicitud en estado pendiente', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)
    const token = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

    const res = await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('msg', 'Solicitud enviada')
    expect(res.body.red).toHaveProperty('estadoAprobacion', 'pendiente')
    expect(res.body.red).toHaveProperty('nombre', RED_TEST.nombre)

    // Verificar que se guardó en BD
    const redEnBD = await RedComunitaria.findOne({ nombre: RED_TEST.nombre })
    expect(redEnBD).not.toBeNull()
    expect(redEnBD.estadoAprobacion).toBe('pendiente')
  })

  it('debe retornar 409 si ya existe una red con ese nombre', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)
    const token = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

    // Crear primera solicitud
    await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    // Intentar crear otra con el mismo nombre
    const res = await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('msg', 'Ya existe una red con ese nombre')
  })

  it('debe retornar 400 si ya tiene una solicitud pendiente', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)
    const token = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

    // Primera solicitud
    await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    // Segunda solicitud con nombre diferente
    const res = await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Otra red distinta',
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('msg', 'Ya tienes una solicitud de red pendiente')
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .post('/api/redes/solicitar-creacion')
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    expect(res.status).toBe(401)
  })

})

// PATCH /api/superadmin/redes/:redId/aprobacion
describe('PATCH /api/superadmin/redes/:redId/aprobacion', () => {

  it('debe retornar 200 y aprobar la red correctamente', async () => {
    await crearSuperAdmin()
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)
    const tokenSuperAdmin = await loginSuperAdmin(SUPER_ADMIN_TEST.email, SUPER_ADMIN_TEST.password)
    const tokenActorC = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

    // Actor C solicita crear red
    const solicitudRes = await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${tokenActorC}`)
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    const redId = solicitudRes.body.red._id

    // SuperAdmin aprueba la red
    const res = await request(app)
      .patch(`/api/superadmin/redes/${redId}/aprobacion`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ accion: 'aprobar' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('msg', 'Red aprobada')
    expect(res.body.red).toHaveProperty('estadoAprobacion', 'aprobada')

    // Verificar que el estudiante ahora tiene rol admin_red en BD
    const estudianteEnBD = await Estudiante.findOne({ email: ESTUDIANTE_C_TEST.email })
    expect(estudianteEnBD.roles).toContain('admin_red')
  })

  it('debe retornar 200 y rechazar la red correctamente', async () => {
    await crearSuperAdmin()
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)
    const tokenSuperAdmin = await loginSuperAdmin(SUPER_ADMIN_TEST.email, SUPER_ADMIN_TEST.password)
    const tokenActorC = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

    const solicitudRes = await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${tokenActorC}`)
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    const redId = solicitudRes.body.red._id

    const res = await request(app)
      .patch(`/api/superadmin/redes/${redId}/aprobacion`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ accion: 'rechazar' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('msg', 'Red rechazada y eliminada')

    // Verificar que la red fue eliminada de la BD
    const redEnBD = await RedComunitaria.findById(redId)
    expect(redEnBD).toBeNull()
  })

  it('debe retornar 400 si la red no está en estado pendiente', async () => {
    await crearSuperAdmin()
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)
    const tokenSuperAdmin = await loginSuperAdmin(SUPER_ADMIN_TEST.email, SUPER_ADMIN_TEST.password)
    const tokenActorC = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

    const solicitudRes = await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${tokenActorC}`)
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    const redId = solicitudRes.body.red._id

    // Aprobar primera vez
    await request(app)
      .patch(`/api/superadmin/redes/${redId}/aprobacion`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ accion: 'aprobar' })

    // Intentar aprobar nuevamente
    const res = await request(app)
      .patch(`/api/superadmin/redes/${redId}/aprobacion`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ accion: 'aprobar' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('msg', 'La red no está en estado pendiente')
  })

  it('debe retornar 400 si la acción no es válida', async () => {
    await crearSuperAdmin()
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)
    const tokenSuperAdmin = await loginSuperAdmin(SUPER_ADMIN_TEST.email, SUPER_ADMIN_TEST.password)
    const tokenActorC = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

    const solicitudRes = await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${tokenActorC}`)
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    const redId = solicitudRes.body.red._id

    const res = await request(app)
      .patch(`/api/superadmin/redes/${redId}/aprobacion`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ accion: 'accionInvalida' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('msg', 'Acción no válida. Debe ser "aprobar" o "rechazar"')
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .patch('/api/superadmin/redes/123456789012345678901234/aprobacion')
      .send({ accion: 'aprobar' })

    expect(res.status).toBe(401)
  })

  it('debe retornar 403 si no es superadmin', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)
    const tokenEstudiante = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

    const res = await request(app)
      .patch('/api/superadmin/redes/123456789012345678901234/aprobacion')
      .set('Authorization', `Bearer ${tokenEstudiante}`)
      .send({ accion: 'aprobar' })

    expect(res.status).toBe(401)
  })

})