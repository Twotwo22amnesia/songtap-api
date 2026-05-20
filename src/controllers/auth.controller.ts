import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AppDataSource } from '../config/database'
import { User } from '../entities/User'

const userRepo = () => AppDataSource.getRepository(User)

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body

    if (!email || !password || !username) {
      res.status(400).json({ error: 'Email, password y username son requeridos' })
      return
    }

    const exists = await userRepo().findOne({ where: { email } })
    if (exists) {
      res.status(409).json({ error: 'El email ya está registrado' })
      return
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = userRepo().create({ email, password: hashed, username })
    await userRepo().save(user)

    const token = jwt.sign(
      { userId: user.id, tier: user.tier },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, username: user.username, tier: user.tier }
    })
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email y password son requeridos' })
      return
    }

    const user = await userRepo().findOne({ where: { email } })
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ error: 'Credenciales inválidas' })
      return
    }

    const token = jwt.sign(
      { userId: user.id, tier: user.tier },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, tier: user.tier }
    })
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}

export const me = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const user = await userRepo().findOne({ where: { id: userId } })

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      tier: user.tier,
      gamesPlayed: user.gamesPlayed,
      createdAt: user.createdAt
    })
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' })
  }
}