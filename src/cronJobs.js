/* eslint-disable no-shadow */
/* eslint-disable no-restricted-syntax */
const cron = require('node-cron')
const fs = require('fs')
const path = require('path')
const syncUpdatedFidePlayersData = require('./helper/syncfidePlayers')
// schedule tasks to be run on the server
const directory = `uploads/files`

cron.schedule('0 1 * * *', () => {
  fs.readdir(directory, (err, files) => {
    if (err) {
      throw err
    }

    for (const file of files) {
      if (!file.startsWith('input') || !file.startsWith('output')) {
        fs.unlink(path.join(directory, file), (err) => {
          if (err) {
            throw err
          }
        })
      }
    }
  })
})

cron.schedule('0 17 * * *', () => {
  console.log('cron started for fetching fide players')
  syncUpdatedFidePlayersData()
})
