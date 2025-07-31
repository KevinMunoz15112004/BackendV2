import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'

const adminRedSchema = new Schema({
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
        required: function () {
            return !this.authMicrosoft
        },
        default: null
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
    avatar: {
        type: String,
        default: null,
        trim: true,
    },
    rol: {
        type: String,
        enum: ['Estudiante', 'Admin_Red'],
        default: 'Admin_Red'
    },
    redAsignada: {
        type: Schema.Types.ObjectId,
        ref: 'RedComunitaria',
        required: true
    },
    authMicrosoft: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

// Método para cifrar la contraseña
adminRedSchema.methods.encrypPassword = async function (password) {
    const salt = await bcrypt.genSalt(10)
    return await bcrypt.hash(password, salt)
}

// Método para verificar la contraseña ingresada
adminRedSchema.methods.matchPassword = async function (password) {
    return await bcrypt.compare(password, this.password)
}

// Método para crear un token
adminRedSchema.methods.crearToken = function () {
    const tokenGenerado = this.token = Math.random().toString(36).slice(2)
    return tokenGenerado
}

export default model('AdminRed', adminRedSchema, 'adminRedes')
