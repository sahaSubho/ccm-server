const express = require('express')
const PlayersController = require('../controllers/PlayersController')
const PlayerValidator = require('../validator/playerValidator')
const upload = require('../helper/uploadFiles')

const router = express.Router()
const auth = require('../middlewares/auth')

const playersController = new PlayersController()
const playerValidator = new PlayerValidator()

router.post(
  '/upload',
  auth(),
  upload.single('file'),
  playerValidator.uploadValidator,
  playersController.uploadPlayers
)
router.get('/:id', playersController.getPlayersByTournament)
router.patch(
  '/update-player-info/:id',
  auth(),
  playersController.updatePlayerDetails
)

module.exports = router
