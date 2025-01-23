/* eslint-disable no-shadow */
/* eslint-disable no-restricted-syntax */
const cron = require('node-cron')
const syncUpdatedFidePlayersData = require('./helper/syncfidePlayers')

cron.schedule('0 21 * * *', () => {
  console.log('cron started for fetching fide players')
  syncUpdatedFidePlayersData()
})
