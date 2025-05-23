const express = require('express')
const TournamentController = require('../controllers/TournamentController')
const TournamentValidator = require('../validator/tournamentValidator')
const upload = require('../helper/uploadFiles')

const router = express.Router()
const auth = require('../middlewares/auth')
const gsApiCheck = require('../middlewares/gsapiKeyCheck')

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
  '/get-circlechess-tournaments',
  tournamentController.getCirclechessTournaments
)
router.get(
  '/get-joined-tournaments',
  tournamentController.getJoinedTournamentByUserId
)
router.post('/verify-password', tournamentController.verifyPassword)
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
router.get(
  '/gs-generate-pairing',
  gsApiCheck,
  tournamentValidator.pairingValidator,
  tournamentController.createTournamentPairing
)
router.get(
  '/revert-pairing',
  auth(),
  tournamentController.revertTournamentPairing
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
router.post('/gs-score-upload', gsApiCheck, tournamentController.updateScoring)
router.get('/statistics', auth(), tournamentController.getStatistics)

router.patch(
  '/remove-pairing',
  auth(),
  tournamentValidator.removePairings,
  tournamentController.removePairings
)
router.patch(
  '/add-pairing',
  auth(),
  tournamentValidator.addPairings,
  tournamentController.addPairings
)

router.get(
  '/get-club-memberships',
  auth(),
  tournamentController.getClubMembership
)
router.post(
  '/split-tournament/:id',
  auth(),
  tournamentController.createCategoryTournament
)

router.post('/config/:id', auth(), tournamentController.setConfiguration)
router.get('/config/:id', auth(), tournamentController.getConfiguration)

router.get('/:id', tournamentController.getTournamentById)
router.post(
  '/update-circlechess-tournament/:id',
  gsApiCheck,
  tournamentController.updateCirclechessTournament
)
router.post(
  '/update-pairing-tableid/:id',
  gsApiCheck,
  tournamentController.updatePairingTableId
)
router.patch(
  '/:id',
  auth(),
  upload.array('files', 10),
  tournamentController.updateTournamentById
)

module.exports = router
