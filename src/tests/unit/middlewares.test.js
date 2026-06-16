import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { isSuperAdmin } from '../../middlewares/authSuperAdmin.js'
import { requirePerfilCompleto, disallowPerfilCompleto } from '../../middlewares/checkPerfilCompleto.js'
const { requireRole, verifyToken } = await import('../../middlewares/auth.js')
const { default: AdminRed } = await import('../../models/adminRedes.js')

const createMocks = () => {
  const json = jest.fn()
  const status = jest.fn(() => ({ json }))
  const next = jest.fn()
  return { res: { status }, status, json, next }
}

describe('authSuperAdmin.isSuperAdmin', () => { 
  it('permite continuar cuando el usuario tiene rol SuperAdmin', () => {
    const { res, next, status } = createMocks()
    const req = { user: { rol: 'SuperAdmin' } }

    isSuperAdmin(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(status).not.toHaveBeenCalled()
  })

  it('responde 403 si el rol no es SuperAdmin', () => {
    const { res, next, status, json } = createMocks()
    const req = { user: { rol: 'superadmin' } }

    isSuperAdmin(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(status).toHaveBeenCalledWith(403)
    expect(json).toHaveBeenCalledWith({
      msg: 'Acceso denegado. Solo para super administradores.'
    })
  })

  it('responde 403 si no hay usuario autenticado', () => {
    const { res, next, status } = createMocks()
    const req = {}

    isSuperAdmin(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(status).toHaveBeenCalledWith(403)
  })
})

describe('checkPerfilCompleto', () => {
  describe('requirePerfilCompleto', () => {
    it('responde 401 si no hay usuario en la petición', async () => {
      const { res, next, status } = createMocks()
      const req = {}

      await requirePerfilCompleto(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(status).toHaveBeenCalledWith(401)
    })

    it('responde 403 si el perfil no está completo', async () => {
      const { res, next, status, json } = createMocks()
      const req = { user: { perfilCompleto: false } }

      await requirePerfilCompleto(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(status).toHaveBeenCalledWith(403)
      expect(json).toHaveBeenCalledWith({
        msg: 'Debes completar tu perfil antes de usar esta funcionalidad'
      })
    })

    it('permite continuar cuando el perfil está completo', async () => {
      const { res, next, status } = createMocks()
      const req = { user: { perfilCompleto: true } }

      await requirePerfilCompleto(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(status).not.toHaveBeenCalled()
    })
  })

  describe('disallowPerfilCompleto', () => {
    it('responde 403 si el perfil ya está completo', async () => {
      const { res, next, status, json } = createMocks()
      const req = { user: { perfilCompleto: true } }

      await disallowPerfilCompleto(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(status).toHaveBeenCalledWith(403)
      expect(json).toHaveBeenCalledWith({ msg: 'El perfil ya está completo' })
    })

    it('permite continuar si el perfil aún no está completo', async () => {
      const { res, next, status } = createMocks()
      const req = { user: { perfilCompleto: false } }

      await disallowPerfilCompleto(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(status).not.toHaveBeenCalled()
    })
  })
})

describe('auth.requireRole', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('responde 403 si el usuario no tiene el rol requerido', async () => {
    const { res, next, status, json } = createMocks()
    const req = { user: { roles: ['estudiante'] } }

    await requireRole('admin_red')(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(status).toHaveBeenCalledWith(403)
    expect(json).toHaveBeenCalledWith({ msg: 'No tienes el rol requerido' })
  })

  it('permite continuar si el usuario tiene el rol requerido', async () => {
    const { res, next, status } = createMocks()
    const req = { user: { roles: ['estudiante', 'admin_red'], _id: '507f1f77bcf86cd799439011' } }

    await requireRole('admin_red')(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(status).not.toHaveBeenCalled()
  })
})
