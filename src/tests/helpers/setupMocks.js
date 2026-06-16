import { jest } from '@jest/globals'

// Mocks de servicios externos

// Mock de nodemailer — evita envío de correos reales
jest.unstable_mockModule('../../config/nodemailer.js', () => ({
  sendMailToRegister: jest.fn().mockResolvedValue(true),
  sendMailToRecoveryPasswordE: jest.fn().mockResolvedValue(true),
  sendMailToRecoveryPassword: jest.fn().mockResolvedValue(true),
  enviarCorreoNuevoAdmin: jest.fn().mockResolvedValue(true),
  sendMailRedAprobada: jest.fn().mockResolvedValue(true),
  sendMailRedRechazada: jest.fn().mockResolvedValue(true),
  sendMailApelacionAprobada: jest.fn().mockResolvedValue(true),
  sendMailApelacionRechazada: jest.fn().mockResolvedValue(true)
}))

// Mock de Pusher — evita notificaciones en tiempo real
jest.unstable_mockModule('../../config/pusher.js', () => ({
  default: {
    trigger: jest.fn().mockResolvedValue(true)
  },

  triggerUserChannel: jest.fn().mockResolvedValue(true)
}))

// Mock de Cloudinary — evita subida de imágenes reales
jest.unstable_mockModule('../../services/mediaService.js', () => ({
  default: {
    handleMedia: jest.fn().mockResolvedValue([
      'http://mock-image.com/test.jpg'
    ])
  }
}))

jest.unstable_mockModule('../../services/profileService.js', () => ({
  default: {
    handleProfileImage: jest.fn().mockResolvedValue(
      'http://mock-image.com/avatar.jpg'
    )
  }
}))

jest.unstable_mockModule('../../models/adminRedes.js', () => ({
  default: {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([])
    })
  }
}))
