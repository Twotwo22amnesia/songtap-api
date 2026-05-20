import 'reflect-metadata'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { AppDataSource } from './config/database'
import { redis } from './config/redis'
import authRoutes from './routes/auth.routes'
import gameRoutes from './routes/game.routes'
import buzzerRoutes from './routes/buzzer.routes'
import mediaRoutes from './routes/media.routes'
import voiceRoutes from './routes/voice.routes'
import aiRoutes from './routes/ai.routes'
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware'


dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes) 
app.use('/api/game', gameRoutes)
app.use('/api/buzzer', buzzerRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/voice', voiceRoutes)
app.use('/api/ai', aiRoutes)
app.use(notFoundMiddleware)
app.use(errorMiddleware)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

async function bootstrap() {
  try {
    await AppDataSource.initialize()
    console.log('✅ PostgreSQL conectado')

    if (redis) {
    await redis.connect().catch(() => {
        console.warn('⚠️  Arrancando sin Redis por ahora')
    })
    } else {
    console.warn('⚠️  Redis no configurado — arrancando sin caché')
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('❌ Error al iniciar:', error)
    process.exit(1)
  }
}

bootstrap()