const fetch = require('node-fetch')
const fs = require('fs')
const unzipper = require('unzipper')
const XmlStream = require('xml-stream')
const moment = require('moment')
const PlayersDao = require('../dao/PlayersDao')
const RedisService = require('../service/RedisService')

const playersDao = new PlayersDao()
const redisService = new RedisService()

function delay(ms) {
  return new Promise((resolve) => {
    return setTimeout(resolve, ms)
  })
}

async function fetchLatestFidePlayers() {
  const dest = 'uploads/fidePlayers.zip'
  const url = 'https://ratings.fide.com/download/players_list_xml.zip'
  try {
    let result = []
    const response = await fetch(url)

    if (response.headers.get('last-modified')) {
      const date = moment.utc(response.headers.get('last-modified'))
      let lastDate = await redisService.getValue('lastfidePlayersFetchedDate')
      lastDate = moment.utc(lastDate)

      if (date.isSame(lastDate)) {
        return { success: true, message: 'Already Updated' }
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

    // Create a writable stream to save the zip file
    const fileStream = fs.createWriteStream(dest)

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
        reject(error) // Reject the promise with the error
      })
    })

    //   fs.mkdirSync(extractPath, { recursive: true })
    // Unzip the file
    try {
      await fs
        .createReadStream(dest)
        .pipe(unzipper.ParseOne())
        .pipe(fs.createWriteStream('uploads/fidePlayers.xml'))
    } catch (error) {
      console.log('err', error)
    }

    await delay(5000)

    const xmlPath = 'uploads/fidePlayers.xml'
    // Create a readable stream to read the XML file
    const xmlStream = fs.createReadStream(xmlPath)

    // Create an XML stream parser
    const parser = new XmlStream(xmlStream)

    // Set event handlers for specific XML elements
    parser.on('endElement: player', async (item) => {
      const data = {
        name: item.name,
        fide_id: item.fideid,
        title: item.title,
        gender: item.sex,
        age: moment().year() - Number(item.birthday),
        rating: item.rating,
      }
      result.push(data)
      await delay(1000)
      if (result.length % 1000 === 0) {
        await playersDao.bulkCreate(result, {
          updateOnDuplicate: ['name', 'title', 'gender', 'age', 'rating'], // Specify fields to update on duplicate
        })
        console.log(`Inserted or Updated total ${result.length} players`)
        result = []
        await delay(3000)
      }
    })

    // Handle errors
    parser.on('error', (error) => {
      console.error('Error parsing XML:', error)
      return {
        success: false,
        message:
          'Error in fetching details of fide-rated players. Please Try after some time.',
      }
    })

    // Start parsing
    parser.on('end', async () => {
      console.log('XML parsing completed')
      await playersDao.bulkCreate(result, {
        updateOnDuplicate: ['name', 'title', 'gender', 'age', 'rating'], // Specify fields to update on duplicate
      })
      console.log(`Inserted or Updated total ${result.length} players`)
      return {
        success: true,
        message: 'Fetched updated details of fide-rated players',
      }
    })
  } catch (error) {
    console.error('Error fetching zip file:', error.message)
  }
}

module.exports = fetchLatestFidePlayers
