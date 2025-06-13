import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'

const estudianteSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  apellido: {
    type: String,
    required: true,
    trim: true
  },
  celular: {
    type: String,
    trim: true,
    default: null
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: Boolean,
    default: true
  },
  token: {
    type: String,
    default: null
  },
  confirmEmail: {
    type: Boolean,
    default: false
  },
  rol: {
    type: String,
    enum: ['Estudiante', 'Admin_Red'],
    default: 'Estudiante'
  },
  redComunitaria: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Método para cifrar la contraseña del estudiante
estudianteSchema.methods.encrypPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Método para verificar la contraseña ingresada
estudianteSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Método para crear un token
estudianteSchema.methods.crearToken = function () {
  const tokenGenerado = this.token = Math.random().toString(36).slice(2);
  return tokenGenerado;
};

export default model('Estudiante', estudianteSchema, 'estudiantes');
