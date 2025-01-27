const express = require('express')
const PlayersController = require('../controllers/PlayersController')
const PlayerValidator = require('../validator/playerValidator')
const upload = require('../helper/uploadFiles')

const router = express.Router()
const auth = require('../middlewares/auth')
const gsApiCheck = require('../middlewares/gsapiKeyCheck')

const playersController = new PlayersController()
const playerValidator = PlayerValidator

router.post(
  '/upload',
  auth(),
  upload.single('file'),
  playerValidator.uploadValidator,
  playersController.uploadPlayers
)

router.post(
  '/upload-sheet',
  upload.single('file'),
  playerValidator.uploadCRValidator,
  playersController.uploadSheet
)
router.patch(
  '/update-player-info/:id',
  auth(),
  playersController.updatePlayerDetails
)
router.post(
  '/upload-prize-winning-players',
  auth(),
  upload.single('file'),
  playerValidator.uploadValidator,
  playersController.uploadPrizeWinningPlayers
)

router.patch(
  '/update-winning-player/:id',
  auth(),
  playersController.updateWinningPlayerDetails
)

router.get(
  '/prize-winning-players/:tournamentId/:type?',
  auth(),
  playersController.getPrizeWinningPlayers
)

router.post(
  '/upload-prize-winning-players',
  auth(),
  upload.single('file'),
  playerValidator.uploadValidator,
  playersController.uploadPrizeWinningPlayers
)

router.post(
  '/distribute-prizes',
  auth(),
  playerValidator.distriubtePrizes,
  playersController.distriubtePrizes
)

router.post(
  '/add-player/:id',
  auth(),
  playerValidator.addPlayer,
  playersController.addPlayer
)

router.post(
  '/join-tournament/:id',
  gsApiCheck,
  playersController.joinTournament
)

router.patch(
  '/withdraw-player',
  auth(),
  playerValidator.withDrawPlayer,
  playersController.withDrawPlayer
)

router.post(
  '/search-fide-players',
  playerValidator.searchFidePlayers,
  playersController.searchFidePlayers
)

router.get('/details', playersController.getPlayersDetails)

router.get('/:id', playersController.getPlayersByTournament)

module.exports = router
