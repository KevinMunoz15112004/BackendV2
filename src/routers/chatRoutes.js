import { Router } from 'express'
import { handleChat } from '../controllers/chatController.js'

const router = Router()

router.post('/chatbot', handleChat)

export default router