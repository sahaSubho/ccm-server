const express = require('express')
const authRoute = require('./authRoute')
const tournamentRoute = require('./tournamentRoute')

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
]

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route)
})

module.exports = router
