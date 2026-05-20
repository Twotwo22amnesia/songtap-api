import { Router } from 'express'
import {
  search, getTrack, getTopTracks,
  searchDeezer, getPreview, getDeezerTop
} from '../controllers/media.controller'

const router = Router()

// Spotify
router.get('/search', search)
router.get('/track/:trackId', getTrack)
router.get('/top', getTopTracks)

// Deezer
router.get('/deezer/search', searchDeezer)
router.get('/deezer/preview', getPreview)
router.get('/deezer/top', getDeezerTop)

export default router