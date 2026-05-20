import { Request, Response } from 'express'
import * as MediaService from '../services/media.service'


export const search = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string
    const limit = parseInt(req.query.limit as string) || 10

    if (!query) {
      res.status(400).json({ error: 'Parámetro q es requerido' })
      return
    }

    const tracks = await MediaService.searchTracks(query, limit)
    res.json({ tracks, total: tracks.length })
  } catch (error: any) {
    res.status(500).json({ error: 'Error al buscar canciones' })
  }
}

export const searchDeezer = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)

    if (!query) {
      res.status(400).json({ error: 'Parámetro q es requerido' })
      return
    }

    const tracks = await MediaService.searchDeezer(query, limit)
    res.json({ tracks, total: tracks.length })
  } catch (error: any) {
    console.error('Error search deezer:', error.message)
    res.status(500).json({ error: 'Error al buscar en Deezer' })
  }
}

export const getPreview = async (req: Request, res: Response) => {
  try {
    const { title, artist } = req.query

    if (!title || !artist) {
      res.status(400).json({ error: 'title y artist son requeridos' })
      return
    }

    const previewUrl = await MediaService.getPreviewUrl(
      title as string,
      artist as string
    )

    if (!previewUrl) {
      res.status(404).json({ error: 'Preview no encontrado' })
      return
    }

    res.json({ previewUrl })
  } catch (error: any) {
    console.error('Error preview:', error.message)
    res.status(500).json({ error: 'Error al obtener preview' })
  }
}

export const getDeezerTop = async (req: Request, res: Response) => {
  try {
    const genre = (req.query.genre as string) || 'reggaeton'
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)

    const tracks = await MediaService.getDeezerTopByGenre(genre, limit)
    res.json({ tracks, total: tracks.length })
  } catch (error: any) {
    console.error('Error deezer top:', error.message)
    res.status(500).json({ error: 'Error al obtener top Deezer' })
  }
}

export const getTrack = async (req: Request, res: Response) => {
  try {
    const trackId = req.params.trackId as string
    const track = await MediaService.getTrackById(trackId)
    res.json(track)
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener canción' })
  }
}

export const getTopTracks = async (req: Request, res: Response) => {
  try {
    const region = (req.query.region as string) || 'PE'
    const genres = req.query.genres
      ? (req.query.genres as string).split(',')
      : []
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)

    console.log('params:', { region, genres, limit }) // log temporal

    const tracks = await MediaService.getTopTracksByRegion(region, genres, limit)
    res.json({ tracks, total: tracks.length })
  } catch (error: any) {
    console.error('Error top tracks:', error.response?.data || error.message)
    res.status(500).json({ error: 'Error al obtener top tracks' })
  }
}