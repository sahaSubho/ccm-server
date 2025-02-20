const fetch = require('node-fetch')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const unzipper = require('unzipper')
const XmlStream = require('xml-stream')
const moment = require('moment')
const PlayersDao = require('../dao/PlayersDao')
const RedisService = require('../service/RedisService')
const { sequelize } = require('../models')

const playersDao = new PlayersDao()
const redisService = new RedisService()

let timer

function debounce(func, timeout = 100) {
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      func.apply(this, args)
    }, timeout)
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-promise-executor-return
    return setTimeout(resolve, ms)
  })
}
// Error handling wrapper for DB insertion
async function processBatch(batch) {
  try {
    const promises = batch.map((p) => {
      return sequelize.transaction(async (t) => {
        await playersDao.updateOrCreateWithTransaction(
          p,
          { fide_id: p.fide_id },
          t
        )
      })
    })

    await Promise.allSettled(promises)

    console.log(`Inserted or Updated total ${batch.length} players`)
  } catch (error) {
    console.error('Error inserting batch:', error)
    // Log the error or save the failed batch somewhere for reprocessing
  }
}

async function processdata(result) {
  await processBatch(result)
}

async function syncUpdatedFidePlayersData() {
  const dest = 'uploads/fidePlayers.zip'
  const url = 'https://ratings.fide.com/download/players_list_xml.zip'
  try {
    console.log('Started fetching fide Players')
    let result = []
    const response = await fetch(url)

    if (response.headers.get('last-modified')) {
      const date = moment.utc(response.headers.get('last-modified'))
      let lastDate = await redisService.getValue('lastfidePlayersFetchedDate')
      lastDate = lastDate ? moment.utc(lastDate) : moment.utc()

      if (date.isSame(lastDate)) {
        console.log('Already Updated')
        return
      }
      await redisService.setValue(
        'lastfidePlayersFetchedDate',
        response.headers.get('last-modified')
      )
    }

    // Check if the response is successful (status code 200)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch zip file. Status: ${response.status} ${response.statusText}`
      )
    }

    console.log('Write zip file')
    // Create a writable stream to save the zip file
    const fileStream = fs.createWriteStream(dest)

    console.log('Write pipe file stream')
    // Pipe the response body to the file stream
    response.body.pipe(fileStream)

    await new Promise((resolve, reject) => {
      fileStream.on('finish', () => {
        fileStream.close()
        console.log('Zip file downloaded successfully')
        resolve() // Resolve the promise when the finish event occurs
      })
      // Handle any errors that occur during the download
      fileStream.on('error', (error) => {
        console.log('filestream error', error)
        reject(error) // Reject the promise with the error
      })
    })

    //   fs.mkdirSync(extractPath, { recursive: true })
    const xmlPath = 'uploads/fidePlayers.xml'

    // Unzip the file
    await new Promise((resolve, reject) => {
      const extractStream = fs
        .createReadStream(dest)
        .pipe(unzipper.ParseOne())
        .pipe(fs.createWriteStream(xmlPath))

      extractStream.on('finish', () => {
        console.log('XML file extracted successfully')
        resolve()
      })

      extractStream.on('error', (error) => {
        console.error('Error extracting XML:', error)
        reject(error)
      })
    })

    // await delay(5000)

    // Create a readable stream to read the XML file
    const xmlStream = fs.createReadStream(xmlPath)

    // Create an XML stream parser
    const parser = new XmlStream(xmlStream)

    // Set event handlers for specific XML elements
    parser.on('endElement: player', async (item) => {
      const data = {
        uuid: uuidv4(),
        name: item.name,
        fide_id: item.fideid,
        title: item.title,
        w_title: item.w_title,
        o_title: item.o_title,
        foa_title: item.foa_title,
        gender: item.sex,
        birth_year: Number(item.birthday),
        age: moment().year() - Number(item.birthday),
        rating: item.rating,
        rapid_rating: item.rapid_rating,
        blitz_rating: item.blitz_rating,
      }
      result.push(data)

      // Check if result buffer has reached the batch size
      if (result.length >= 500) {
        // Process and insert the batch, then clear the buffer
        processdata(result)

        result = []
        await delay(500) // Introduce delay to reduce DB load (optional)
      }
    })

    // Handle errors
    parser.on('error', (error) => {
      console.error('Error parsing XML:', error)
    })

    // Start parsing
    parser.on('end', async () => {
      console.log('XML parsing completed')
      // Process any remaining players in the result buffer
      if (result.length > 0) {
        await processBatch(result)
      }

      console.log('All players processed successfully.')
    })
  } catch (error) {
    console.error('Error fetching zip file:', error.message)
  }
}

module.exports = syncUpdatedFidePlayersData
