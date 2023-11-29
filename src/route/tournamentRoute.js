const express = require('express')
const TournamentController = require('../controllers/TournamentController')
const TournamentValidator = require('../validator/tournamentValidator')
const upload = require('../helper/uploadFiles')

const router = express.Router()
const auth = require('../middlewares/auth')

const tournamentController = new TournamentController()
const tournamentValidator = TournamentValidator

router.post(
  '/create',
  auth(),
  upload.array('files', 2),
  tournamentValidator.createValidator,
  tournamentController.create
)
router.post(
  '/create-lichess-tournament',
  auth(),
  tournamentController.createLichessTournament
)
router.get('/get-tournaments', tournamentController.getTournaments)
router.get(
  '/get-tournament-list',
  auth(),
  tournamentController.getTournamentsByUser
)
router.get(
  '/generate-pairing',
  auth(),
  tournamentValidator.pairingValidator,
  tournamentController.createTournamentPairing
)
router.post(
  '/upload-pairing',
  auth(),
  upload.single('file'),
  tournamentValidator.uploadValidator,
  tournamentController.uploadTournamentPairing
)
router.get(
  '/get-pairings',
  tournamentValidator.pairingValidator,
  tournamentController.getPairings
)
router.get(
  '/players-ranking',
  tournamentValidator.pairingValidator,
  tournamentController.getPlayersRanking
)
router.post(
  '/prize-categories',
  auth(),
  tournamentValidator.createPrizeValidator,
  tournamentController.createPrizingCategories
)
router.post(
  '/prize-config/:id',
  auth(),
  tournamentValidator.saveTournamentPrizeValidator,
  tournamentController.updatePrizeCategories
)
router.get(
  '/get-static-prize-cats/:id',
  tournamentController.getStaticPrizeCategories
)
router.post('/upload', auth(), tournamentController.uploadWinners)
router.post('/score-upload', auth(), tournamentController.updateScoring)
router.get('/statistics', auth(), tournamentController.getStatistics)

router.get('/:id', tournamentController.getTournamentById)
router.patch(
  '/:id',
  auth(),
  upload.array('files', 10),
  tournamentController.updateTournamentById
)
router.post(
  '/upload-image',
  auth(),
  upload.single('file'),
  tournamentController.uploadBrochureImage
)

module.exports = router
