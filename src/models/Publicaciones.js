import mongoose from "mongoose";

const comentarioSchema = new mongoose.Schema({
  autorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estudiante',
    required: true
  },
  contenido: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const publicacionSchema = new mongoose.Schema({
  autorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estudiante',
    required: true
  },
  comunidadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RedComunitaria',
    required: true
  },
  titulo: {
    type: String,
    required: true
  },
  contenido: {
    type: String,
    required: true
  },
  comentarios: [comentarioSchema],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estudiante'
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Publicacion = mongoose.model("Publicacion", publicacionSchema);

export default Publicacion;