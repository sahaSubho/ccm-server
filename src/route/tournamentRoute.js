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

router.get('/get-tournaments', auth(), tournamentController.getTournaments)

module.exports = router
