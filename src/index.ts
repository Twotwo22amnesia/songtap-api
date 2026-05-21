import 'reflect-metadata'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
// import dotenv from 'dotenv'
import { AppDataSource } from './config/database'
import { redis } from './config/redis'
import authRoutes from './routes/auth.routes'
import gameRoutes from './routes/game.routes'
import buzzerRoutes from './routes/buzzer.routes'
import mediaRoutes from './routes/media.routes'
import voiceRoutes from './routes/voice.routes'
import aiRoutes from './routes/ai.routes'
import spotifyRoutes from './routes/spotify.routes'
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware'
 
const app = express()
const PORT = process.env.PORT || 3000
console.log('TEST_VAR:', process.env.TEST_VAR)
console.log('All env keys:', Object.keys(process.env).filter(k => !k.startsWith('npm')))
app.use(helmet()) 
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true')
  next()
})
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:3000',
    'http://192.168.18.152:8081',
    'https://eenapmi-anonymous-8081.exp.direct',
    'https://removing-compactly-flogging.ngrok-free.dev',
    /\.exp\.direct$/,
    /\.ngrok-free\.dev$/,
  ],
  credentials: true,
}))
app.use(express.json())
app.use('/api/auth', authRoutes) 
app.use('/api/game', gameRoutes)
app.use('/api/buzzer', buzzerRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/voice', voiceRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/spotify', spotifyRoutes)
app.use(notFoundMiddleware)
app.use(errorMiddleware)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

async function bootstrap() {
  try {
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.log('NODE_ENV:', process.env.NODE_ENV)
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