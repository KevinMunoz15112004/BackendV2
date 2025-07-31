import express from 'express';
import Mensaje from '../models/Mensajes.js';

const router = express.Router();

router.get('/mensajes/historial/:estudianteA/:estudianteB', async (req, res) => {
  const { estudianteA, estudianteB } = req.params;

  try {
    const mensajes = await Mensaje.find({
      $or: [
        { autor: estudianteA, destinatario: estudianteB },
        { autor: estudianteB, destinatario: estudianteA }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('autor', 'nombre apellido');

    res.json(mensajes);
  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener mensajes' });
  }
});

export default router;
