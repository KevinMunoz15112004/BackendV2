import request from 'supertest'
import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals'
import app from '../../server.js'
import { connectDB, clearDB, closeDB } from '../helpers/setupDB.js'
import {
  crearSuperAdmin,
  crearEstudianteConPerfil,
  SUPER_ADMIN_TEST,
  ESTUDIANTE_B_TEST,
  ESTUDIANTE_C_TEST,
  RED_TEST,
  PUBLICACION_TEST
} from '../helpers/seeders.js'
import { loginSuperAdmin, loginEstudiante, loginAdminRed } from '../helpers/authHelpers.js'
import Publicacion from '../../models/Publicaciones.js'
import Estudiante from '../../models/Estudiantes.js'

// Setup
beforeAll(async () => await connectDB())
afterEach(async () => await clearDB())
afterAll(async () => await closeDB())

// Helper interno para crear el flujo base completo
// red aprobada + Actor B unido + publicación creada + Actor C como admin_red
const crearFlujoBase = async () => {
  await crearSuperAdmin()
  await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
  await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)

  const tokenSuperAdmin = await loginSuperAdmin(SUPER_ADMIN_TEST.email, SUPER_ADMIN_TEST.password)
  const tokenActorB = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)
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

  // SuperAdmin aprueba la red — Actor C pasa a ser admin_red
  await request(app)
    .patch(`/api/superadmin/redes/${redId}/aprobacion`)
    .set('Authorization', `Bearer ${tokenSuperAdmin}`)
    .send({ accion: 'aprobar' })

  // Actor C re-login para obtener token con rol admin_red
  const tokenAdminRed = await loginAdminRed(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

  // Actor B se une a la red
  await request(app)
    .post('/api/estudiantes/unirse/red')
    .set('Authorization', `Bearer ${tokenActorB}`)
    .send({ redId })

  // Actor B crea publicación A — será reportada y eliminada por moderación
  const pubARes = await request(app)
    .post('/api/estudiantes/publicaciones')
    .set('Authorization', `Bearer ${tokenActorB}`)
    .send({ ...PUBLICACION_TEST, comunidadId: redId })

  const publicacionAId = pubARes.body.publicacion._id

  // Actor B crea publicación B — será eliminada manualmente por el autor
  const pubBRes = await request(app)
    .post('/api/estudiantes/publicaciones')
    .set('Authorization', `Bearer ${tokenActorB}`)
    .send({ ...PUBLICACION_TEST, comunidadId: redId })

  const publicacionBId = pubBRes.body.publicacion._id

  return {
    tokenSuperAdmin,
    tokenActorB,
    tokenActorC,
    tokenAdminRed,
    redId,
    publicacionAId,
    publicacionBId
  }
}

// POST /api/reportes/publicacion
describe('POST /api/reportes/publicacion', () => {

  it('debe retornar 201 y crear el reporte correctamente', async () => {
    const { tokenActorB, publicacionAId } = await crearFlujoBase()

    const res = await request(app)
      .post('/api/reportes/publicacion')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({
        publicacionId: publicacionAId,
        tipo: 'Contenido Inapropiado',
        descripcion: 'Esta publicación contiene contenido inapropiado'
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('msg', 'Reporte creado')
    expect(res.body.reporte).toHaveProperty('subtype', 'publicacion')
    expect(res.body.reporte).toHaveProperty('tipo', 'Contenido Inapropiado')
  })

  it('debe retornar 404 si la publicación no existe', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    const tokenActorB = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const res = await request(app)
      .post('/api/reportes/publicacion')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({
        publicacionId: '123456789012345678901234',
        tipo: 'Contenido Inapropiado',
        descripcion: 'Descripción del reporte'
      })

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('msg', 'Publicación no encontrada')
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .post('/api/reportes/publicacion')
      .send({
        publicacionId: '123456789012345678901234',
        tipo: 'Contenido Inapropiado',
        descripcion: 'Descripción del reporte'
      })

    expect(res.status).toBe(401)
  })

})

// PATCH /api/admin/reportes/:id/resolver
describe('PATCH /api/admin/reportes/:id/resolver', () => {

  it('debe retornar 200 y rechazar el reporte correctamente', async () => {
    const { tokenActorB, tokenAdminRed, publicacionAId } = await crearFlujoBase()

    // Actor B reporta publicación A
    const reporteRes = await request(app)
      .post('/api/reportes/publicacion')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({
        publicacionId: publicacionAId,
        tipo: 'Contenido Inapropiado',
        descripcion: 'Descripción del reporte'
      })

    const reporteId = reporteRes.body.reporte._id

    // Admin red rechaza el reporte
    const res = await request(app)
      .patch(`/api/admin/reportes/${reporteId}/resolver`)
      .set('Authorization', `Bearer ${tokenAdminRed}`)
      .send({
        estado: 'Rechazada',
        respuesta: 'El contenido no viola las normas de la comunidad'
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('msg', 'Reporte rechazado')
    expect(res.body.reporte).toHaveProperty('estado', 'rechazado')

    // Verificar que la publicación sigue existiendo en BD
    const publicacionEnBD = await Publicacion.findById(publicacionAId)
    expect(publicacionEnBD).not.toBeNull()
  })

  it('debe retornar 200, resolver el reporte a favor y eliminar la publicación con strike', async () => {
    const { tokenActorB, tokenAdminRed, publicacionAId } = await crearFlujoBase()

    // Actor B reporta publicación A
    const reporteRes = await request(app)
      .post('/api/reportes/publicacion')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({
        publicacionId: publicacionAId,
        tipo: 'Contenido Inapropiado',
        descripcion: 'Descripción del reporte'
      })

    const reporteId = reporteRes.body.reporte._id

    // Admin red resuelve a favor — elimina publicación y emite strike
    const res = await request(app)
      .patch(`/api/admin/reportes/${reporteId}/resolver`)
      .set('Authorization', `Bearer ${tokenAdminRed}`)
      .send({
        estado: 'Resuelta',
        respuesta: 'El contenido viola las normas de la comunidad'
      })

    expect(res.status).toBe(200)
    expect(res.body.msg).toMatch(/Reporte resuelto/)
    expect(res.body.reporte).toHaveProperty('estado', 'resuelto')

    // Verificar que la publicación fue eliminada de la BD
    const publicacionEnBD = await Publicacion.findById(publicacionAId)
    expect(publicacionEnBD).toBeNull()

    // Verificar que el autor recibió un strike
    const autorEnBD = await Estudiante.findOne({ email: ESTUDIANTE_B_TEST.email })
    expect(autorEnBD.strikes.length).toBeGreaterThan(0)
  })

  it('debe retornar 400 si el reporte ya fue resuelto', async () => {
    const { tokenActorB, tokenAdminRed, publicacionAId } = await crearFlujoBase()

    const reporteRes = await request(app)
      .post('/api/reportes/publicacion')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({
        publicacionId: publicacionAId,
        tipo: 'Contenido Inapropiado',
        descripcion: 'Descripción del reporte'
      })

    const reporteId = reporteRes.body.reporte._id

    // Resolver primera vez
    await request(app)
      .patch(`/api/admin/reportes/${reporteId}/resolver`)
      .set('Authorization', `Bearer ${tokenAdminRed}`)
      .send({ estado: 'Rechazada' })

    // Intentar resolver segunda vez
    const res = await request(app)
      .patch(`/api/admin/reportes/${reporteId}/resolver`)
      .set('Authorization', `Bearer ${tokenAdminRed}`)
      .send({ estado: 'Resuelta' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('msg', 'El reporte ya fue resuelto o rechazado')
  })

  it('debe retornar 400 si el estado es inválido', async () => {
    const { tokenActorB, tokenAdminRed, publicacionAId } = await crearFlujoBase()

    const reporteRes = await request(app)
      .post('/api/reportes/publicacion')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({
        publicacionId: publicacionAId,
        tipo: 'Contenido Inapropiado',
        descripcion: 'Descripción del reporte'
      })

    const reporteId = reporteRes.body.reporte._id

    const res = await request(app)
      .patch(`/api/admin/reportes/${reporteId}/resolver`)
      .set('Authorization', `Bearer ${tokenAdminRed}`)
      .send({ estado: 'EstadoInvalido' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('msg', 'Estado inválido. Solo se acepta "Resuelta" o "Rechazada"')
  })

  it('debe retornar 403 si no es admin_red', async () => {
    const { tokenActorB, publicacionAId } = await crearFlujoBase()

    const reporteRes = await request(app)
      .post('/api/reportes/publicacion')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({
        publicacionId: publicacionAId,
        tipo: 'Contenido Inapropiado',
        descripcion: 'Descripción del reporte'
      })

    const reporteId = reporteRes.body.reporte._id

    // Actor B intenta resolver siendo solo estudiante
    const res = await request(app)
      .patch(`/api/admin/reportes/${reporteId}/resolver`)
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ estado: 'Resuelta' })

    expect(res.status).toBe(403)
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .patch('/api/admin/reportes/123456789012345678901234/resolver')
      .send({ estado: 'Resuelta' })

    expect(res.status).toBe(401)
  })

})