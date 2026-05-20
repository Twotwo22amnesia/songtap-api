import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  code?: string
}

export const errorMiddleware = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Error interno del servidor'

  // log en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.error(`❌ [${req.method}] ${req.path} → ${statusCode}: ${message}`)
    if (err.stack) console.error(err.stack)
  }

  // errores conocidos de TypeORM
  if (err.code === '23505') {
    res.status(409).json({ error: 'Ya existe un registro con esos datos' })
    return
  }

  if (err.code === '23503') {
    res.status(400).json({ error: 'Referencia inválida' })
    return
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export const notFoundMiddleware = (req: Request, res: Response) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.path} no encontrada` })
}