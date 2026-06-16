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
import { loginSuperAdmin, loginEstudiante } from '../helpers/authHelpers.js'
import Estudiante from '../../models/Estudiantes.js'
import RedComunitaria from '../../models/RedComunitaria.js'
import Publicacion from '../../models/Publicaciones.js'

// Setup
beforeAll(async () => await connectDB())
afterEach(async () => await clearDB())
afterAll(async () => await closeDB())

// Helper interno para crear el flujo base: red aprobada + estudiante B unido
const crearFlujBase = async () => {
  await crearSuperAdmin()
  await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
  await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)

  const tokenSuperAdmin = await loginSuperAdmin(SUPER_ADMIN_TEST.email, SUPER_ADMIN_TEST.password)
  const tokenActorC = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)
  const tokenActorB = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

  // Actor C solicita red
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
  await request(app)
    .patch(`/api/superadmin/redes/${redId}/aprobacion`)
    .set('Authorization', `Bearer ${tokenSuperAdmin}`)
    .send({ accion: 'aprobar' })

  // Actor B se une a la red
  await request(app)
    .post('/api/estudiantes/unirse/red')
    .set('Authorization', `Bearer ${tokenActorB}`)
    .send({ redId })

  return { tokenActorB, tokenActorC, tokenSuperAdmin, redId }
}

// POST /api/estudiantes/unirse/red
describe('POST /api/estudiantes/unirse/red', () => {
  it('debe retornar 200 y unirse a la red correctamente', async () => {
    await crearSuperAdmin()
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)

    const tokenSuperAdmin = await loginSuperAdmin(SUPER_ADMIN_TEST.email, SUPER_ADMIN_TEST.password)
    const tokenActorC = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)
    const tokenActorB = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const solicitudRes = await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${tokenActorC}`)
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    const redId = solicitudRes.body.red._id

    await request(app)
      .patch(`/api/superadmin/redes/${redId}/aprobacion`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ accion: 'aprobar' })

    const res = await request(app)
      .post('/api/estudiantes/unirse/red')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ redId })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('msg', 'Te has unido exitosamente a la red comunitaria')
    expect(res.body.red).toHaveProperty('id', redId)

    // Verificar en BD que el estudiante está en la red
    const estudianteEnBD = await Estudiante.findOne({ email: ESTUDIANTE_B_TEST.email })
    const redEnBD = await RedComunitaria.findById(redId)
    expect(estudianteEnBD.redComunitaria.map(r => r.toString())).toContain(redId)
    expect(redEnBD.miembros.map(m => m.toString())).toContain(estudianteEnBD._id.toString())
  })

  it('debe retornar 400 si el estudiante ya pertenece a la red', async () => {
    const { tokenActorB, redId } = await crearFlujBase()

    const res = await request(app)
      .post('/api/estudiantes/unirse/red')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ redId })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('msg', 'Ya perteneces a esta red comunitaria')
  })

  it('debe retornar 404 si la red no existe', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    const tokenActorB = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const res = await request(app)
      .post('/api/estudiantes/unirse/red')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ redId: '123456789012345678901234' })

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('msg', 'La red comunitaria no existe')
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .post('/api/estudiantes/unirse/red')
      .send({ redId: '123456789012345678901234' })

    expect(res.status).toBe(401)
  })

})

// POST /api/estudiantes/publicaciones
describe('POST /api/estudiantes/publicaciones', () => {

  it('debe retornar 201 y crear la publicación correctamente', async () => {
    const { tokenActorB, redId } = await crearFlujBase()

    const res = await request(app)
      .post('/api/estudiantes/publicaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({
        ...PUBLICACION_TEST,
        comunidadId: redId
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('msg', 'Publicación creada correctamente')
    expect(res.body.publicacion).toHaveProperty('contenido', PUBLICACION_TEST.contenido)
    expect(res.body.publicacion).toHaveProperty('categoria', PUBLICACION_TEST.categoria)

    // Verificar en BD
    const publicacionEnBD = await Publicacion.findById(res.body.publicacion._id)
    expect(publicacionEnBD).not.toBeNull()
  })

  it('debe retornar 403 si el estudiante no pertenece a la red', async () => {
    await crearSuperAdmin()
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    await crearEstudianteConPerfil(ESTUDIANTE_C_TEST)

    const tokenSuperAdmin = await loginSuperAdmin(SUPER_ADMIN_TEST.email, SUPER_ADMIN_TEST.password)
    const tokenActorC = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)
    const tokenActorB = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const solicitudRes = await request(app)
      .post('/api/redes/solicitar-creacion')
      .set('Authorization', `Bearer ${tokenActorC}`)
      .send({
        nombre: RED_TEST.nombre,
        descripcion: RED_TEST.descripcion,
        proposito: RED_TEST.proposito
      })

    const redId = solicitudRes.body.red._id

    await request(app)
      .patch(`/api/superadmin/redes/${redId}/aprobacion`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ accion: 'aprobar' })

    // Actor B intenta publicar sin unirse a la red
    const res = await request(app)
      .post('/api/estudiantes/publicaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({
        ...PUBLICACION_TEST,
        comunidadId: redId
      })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('msg', 'No perteneces a esta red comunitaria')
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .post('/api/estudiantes/publicaciones')
      .send({
        ...PUBLICACION_TEST,
        comunidadId: '123456789012345678901234'
      })

    expect(res.status).toBe(401)
  })

})

// POST /api/publicaciones/:id/like y DELETE /api/publicaciones/:id/like
describe('Likes en publicaciones', () => {

  it('debe retornar 201 al dar like correctamente', async () => {
    const { tokenActorB, redId } = await crearFlujBase()

    const pubRes = await request(app)
      .post('/api/estudiantes/publicaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ ...PUBLICACION_TEST, comunidadId: redId })

    const publicacionId = pubRes.body.publicacion._id

    const res = await request(app)
      .post(`/api/publicaciones/${publicacionId}/like`)
      .set('Authorization', `Bearer ${tokenActorB}`)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('msg', 'Like agregado')
    expect(res.body).toHaveProperty('likes')
  })

  it('debe retornar 409 si el estudiante ya dio like', async () => {
    const { tokenActorB, redId } = await crearFlujBase()

    const pubRes = await request(app)
      .post('/api/estudiantes/publicaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ ...PUBLICACION_TEST, comunidadId: redId })

    const publicacionId = pubRes.body.publicacion._id

    // Dar like primera vez
    await request(app)
      .post(`/api/publicaciones/${publicacionId}/like`)
      .set('Authorization', `Bearer ${tokenActorB}`)

    // Dar like segunda vez
    const res = await request(app)
      .post(`/api/publicaciones/${publicacionId}/like`)
      .set('Authorization', `Bearer ${tokenActorB}`)

    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('msg', 'Ya diste like a esta publicación')
  })

  it('debe retornar 200 al quitar like correctamente', async () => {
    const { tokenActorB, redId } = await crearFlujBase()

    const pubRes = await request(app)
      .post('/api/estudiantes/publicaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ ...PUBLICACION_TEST, comunidadId: redId })

    const publicacionId = pubRes.body.publicacion._id

    // Dar like
    await request(app)
      .post(`/api/publicaciones/${publicacionId}/like`)
      .set('Authorization', `Bearer ${tokenActorB}`)

    // Quitar like
    const res = await request(app)
      .delete(`/api/publicaciones/${publicacionId}/like`)
      .set('Authorization', `Bearer ${tokenActorB}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('msg', 'Like removido')
  })

  it('debe retornar 409 si el estudiante no tiene like para quitar', async () => {
    const { tokenActorB, redId } = await crearFlujBase()

    const pubRes = await request(app)
      .post('/api/estudiantes/publicaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ ...PUBLICACION_TEST, comunidadId: redId })

    const publicacionId = pubRes.body.publicacion._id

    const res = await request(app)
      .delete(`/api/publicaciones/${publicacionId}/like`)
      .set('Authorization', `Bearer ${tokenActorB}`)

    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('msg', 'No tienes like en esta publicación')
  })

})

// POST /api/publicaciones/:id/comentarios
describe('POST /api/publicaciones/:id/comentarios', () => {

  it('debe retornar 201 y crear el comentario correctamente', async () => {
    const { tokenActorB, redId } = await crearFlujBase()

    const pubRes = await request(app)
      .post('/api/estudiantes/publicaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ ...PUBLICACION_TEST, comunidadId: redId })

    const publicacionId = pubRes.body.publicacion._id

    const res = await request(app)
      .post(`/api/publicaciones/${publicacionId}/comentarios`)
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ contenido: 'Este es un comentario de prueba' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('msg', 'Comentario creado')
    expect(res.body.comentario).toHaveProperty('contenido', 'Este es un comentario de prueba')
    expect(res.body.comentario.userId).toHaveProperty('nombre', ESTUDIANTE_B_TEST.nombre)
    expect(res.body.comentario.userId).toHaveProperty('apellido', ESTUDIANTE_B_TEST.apellido)
  })

  it('debe retornar 404 si la publicación no existe', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    const tokenActorB = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const res = await request(app)
      .post('/api/publicaciones/123456789012345678901234/comentarios')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ contenido: 'Comentario de prueba' })

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('msg', 'Publicación no encontrada')
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .post('/api/publicaciones/123456789012345678901234/comentarios')
      .send({ contenido: 'Comentario de prueba' })

    expect(res.status).toBe(401)
  })

})

// GET /api/notificaciones
describe('GET /api/notificaciones', () => {

  it('debe retornar 200 y listar las notificaciones del estudiante', async () => {
    const { tokenActorB, tokenActorC, redId } = await crearFlujBase()

    // Actor B crea publicación
    const pubRes = await request(app)
      .post('/api/estudiantes/publicaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ ...PUBLICACION_TEST, comunidadId: redId })

    const publicacionId = pubRes.body.publicacion._id

    // Actor C re-login para tener token actualizado
    const tokenActorCActualizado = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

    // Actor C da like a la publicación de Actor B — genera notificación
    await request(app)
      .post(`/api/publicaciones/${publicacionId}/like`)
      .set('Authorization', `Bearer ${tokenActorCActualizado}`)

    // Actor B consulta sus notificaciones
    const res = await request(app)
      .get('/api/notificaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('notificaciones')
    expect(Array.isArray(res.body.notificaciones)).toBe(true)
    expect(res.body.notificaciones.length).toBeGreaterThan(0)
    expect(res.body.notificaciones[0]).toHaveProperty('tipo', 'like')
  })

  it('debe retornar 200 con array vacío si no hay notificaciones', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    const tokenActorB = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const res = await request(app)
      .get('/api/notificaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('notificaciones')
    expect(res.body.notificaciones).toHaveLength(0)
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .get('/api/notificaciones')

    expect(res.status).toBe(401)
  })

})

// DELETE /api/publicaciones/eliminar/:id
describe('DELETE /api/publicaciones/eliminar/:id', () => {

  it('debe retornar 200 y eliminar la publicación correctamente', async () => {
    const { tokenActorB, redId } = await crearFlujBase()

    // Crear publicación B — la que eliminará el autor manualmente
    const pubRes = await request(app)
      .post('/api/estudiantes/publicaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ ...PUBLICACION_TEST, comunidadId: redId })

    const publicacionId = pubRes.body.publicacion._id

    const res = await request(app)
      .delete(`/api/publicaciones/eliminar/${publicacionId}`)
      .set('Authorization', `Bearer ${tokenActorB}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('msg', 'Publicación eliminada correctamente')

    // Verificar que se eliminó de la BD
    const publicacionEnBD = await Publicacion.findById(publicacionId)
    expect(publicacionEnBD).toBeNull()
  })

  it('debe retornar 403 si el estudiante no es el autor', async () => {
    const { tokenActorB, tokenActorC, redId } = await crearFlujBase()

    const pubRes = await request(app)
      .post('/api/estudiantes/publicaciones')
      .set('Authorization', `Bearer ${tokenActorB}`)
      .send({ ...PUBLICACION_TEST, comunidadId: redId })

    const publicacionId = pubRes.body.publicacion._id

    // Actor C intenta eliminar la publicación de Actor B
    const tokenActorCActualizado = await loginEstudiante(ESTUDIANTE_C_TEST.email, ESTUDIANTE_C_TEST.password)

    const res = await request(app)
      .delete(`/api/publicaciones/eliminar/${publicacionId}`)
      .set('Authorization', `Bearer ${tokenActorCActualizado}`)

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('msg', 'No tienes permiso para eliminar esta publicación')
  })

  it('debe retornar 404 si la publicación no existe', async () => {
    await crearEstudianteConPerfil(ESTUDIANTE_B_TEST)
    const tokenActorB = await loginEstudiante(ESTUDIANTE_B_TEST.email, ESTUDIANTE_B_TEST.password)

    const res = await request(app)
      .delete('/api/publicaciones/eliminar/123456789012345678901234')
      .set('Authorization', `Bearer ${tokenActorB}`)

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('msg', 'Publicación no encontrada')
  })

  it('debe retornar 401 si no hay token', async () => {
    const res = await request(app)
      .delete('/api/publicaciones/eliminar/123456789012345678901234')

    expect(res.status).toBe(401)
  })

})