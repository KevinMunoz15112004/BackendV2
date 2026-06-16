import { describe, it, expect, jest } from '@jest/globals'
import { validationResult } from 'express-validator'
import { nameValidator, usernameValidator } from '../../validators/stringValidators.js'
import { mongoIdBody } from '../../validators/mongoValidators.js'
import { reportPublicacionValidator } from '../../validators/reportValidators.js'
import validateResult from '../../validators/validateResult.js'

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011'

const runValidators = async (validators, data, source = 'body') => {
  const req = { body: {}, params: {}, query: {} }
  req[source] = data

  for (const validator of validators) {
    await validator.run(req)
  }

  return validationResult(req)
}

describe('stringValidators', () => {
  describe('nameValidator', () => {
    it('acepta nombres válidos con al menos 2 caracteres', async () => {
      const result = await runValidators(
        [nameValidator('apellido')],
        { apellido: 'Beta' }
      )

      expect(result.isEmpty()).toBe(true)
    })

    it('rechaza apellidos de un solo carácter', async () => {
      const result = await runValidators(
        [nameValidator('apellido')],
        { apellido: 'B' }
      )

      expect(result.isEmpty()).toBe(false)
      expect(result.array()[0].msg).toBe('apellido debe tener entre 2 y 50 caracteres')
    })

    it('rechaza nombres con números o caracteres especiales', async () => {
      const result = await runValidators(
        [nameValidator('nombre')],
        { nombre: 'Juan123' }
      )

      expect(result.isEmpty()).toBe(false)
      expect(result.array()[0].msg).toBe(
        'nombre no debe contener números, caracteres especiales ni letras repetidas excesivamente'
      )
    })
  })

  describe('usernameValidator', () => {
    it('acepta usernames válidos entre 3 y 30 caracteres', async () => {
      const result = await runValidators(
        [usernameValidator('username')],
        { username: 'estudianteB' }
      )

      expect(result.isEmpty()).toBe(true)
    })

    it('rechaza usernames con menos de 3 caracteres', async () => {
      const result = await runValidators(
        [usernameValidator('username', { min: 3, max: 30 })],
        { username: 'ab' }
      )

      expect(result.isEmpty()).toBe(false)
      expect(result.array()[0].msg).toBe('username debe tener entre 3 y 30 caracteres')
    })
  })
})

describe('mongoValidators', () => {
  describe('mongoIdBody', () => {
    it('acepta un ObjectId válido', async () => {
      const result = await runValidators(
        [mongoIdBody('publicacionId')],
        { publicacionId: VALID_OBJECT_ID }
      )

      expect(result.isEmpty()).toBe(true)
    })

    it('rechaza ids con formato inválido', async () => {
      const result = await runValidators(
        [mongoIdBody('publicacionId')],
        { publicacionId: 'id-invalido' }
      )

      expect(result.isEmpty()).toBe(false)
      expect(result.array()[0].msg).toBe('publicacionId no es un ObjectId válido')
    })
  })
})

describe('reportValidators', () => {
  describe('reportPublicacionValidator', () => {
    it('acepta tipos de reporte permitidos para publicaciones', async () => {
      const result = await runValidators(
        reportPublicacionValidator,
        {
          publicacionId: VALID_OBJECT_ID,
          tipo: 'Contenido Inapropiado'
        }
      )

      expect(result.isEmpty()).toBe(true)
    })

    it('rechaza tipos fuera del catálogo definido', async () => {
      const result = await runValidators(
        reportPublicacionValidator,
        {
          publicacionId: VALID_OBJECT_ID,
          tipo: 'contenido_inapropiado'
        }
      )

      expect(result.isEmpty()).toBe(false)
      expect(result.array()[0].msg).toBe('Tipo no permitido')
    })

    it('exige descripción cuando el tipo es "Otro"', async () => {
      const result = await runValidators(
        reportPublicacionValidator,
        {
          publicacionId: VALID_OBJECT_ID,
          tipo: 'Otro'
        }
      )

      expect(result.isEmpty()).toBe(false)
      expect(result.array()[0].msg).toBe('Descripcion obligatoria para "Otro"')
    })
  })
})

describe('validateResult', () => {
  it('continúa al siguiente middleware si no hay errores', async () => {
    const req = { body: { apellido: 'Beta' } }
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    const next = jest.fn()
    const res = { status }

    await nameValidator('apellido').run(req)
    validateResult(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(status).not.toHaveBeenCalled()
  })

  it('responde 400 con el arreglo de errores si la validación falla', async () => {
    const req = { body: { apellido: 'B' } }
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    const next = jest.fn()
    const res = { status }

    await nameValidator('apellido').run(req)
    validateResult(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })
})
