import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

export const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI_TEST)
}

export const clearDB = async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}

export const closeDB = async () => {
  await mongoose.connection.close()
}