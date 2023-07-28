const express = require('express')
const authRoute = require('./authRoute')
const tournamentRoute = require('./tournamentRoute')
const playersRoute = require('./playersRoute')

const router = express.Router()

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/tournament',
    route: tournamentRoute,
  },
  {
    path: '/players',
    route: playersRoute,
  },
]

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route)
})

module.exports = router
