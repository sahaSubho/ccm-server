const express = require('express')
const TournamentController = require('../controllers/TournamentController')
const TournamentValidator = require('../validator/tournamentValidator')
const upload = require('../helper/uploadFiles')

const router = express.Router()
const auth = require('../middlewares/auth')

const tournamentController = new TournamentController()
const tournamentValidator = new TournamentValidator()

router.post(
  '/create',
  auth(),
  upload.array('files', 10),
  tournamentValidator.createValidator,
  tournamentController.create
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
router.get(
  '/get-pairings',
  auth(),
  tournamentValidator.pairingValidator,
  tournamentController.getPairings
)

module.exports = router
