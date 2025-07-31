/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const { spawn } = require('child_process')
const fs = require('fs')
const uploadFileToS3 = require('../uploadFiletoS3')
const config = require('../../config/config')

const pairOld = (input, players, teams = [], fileName = '', type = '') => {
  const javafoJarPath = 'src/helper/pairingEngine/files/javafo.jar' // Path to javafo.jar in your project
  const trfFilePath = `uploads/files/input_${fileName}.trf` // Path to your input TRF file
  const outputFilePath = `uploads/files/output_${fileName}.trf` // Path to the output file
  const bbpPairingFile =
    '/var/www/cc-event/src/helper/pairingEngine/files/bbpPairings.exe'
  let isBbpPairing = false

  if (!fs.existsSync('uploads/files')) {
    fs.mkdirSync('uploads/files', { recursive: true })
  }

  fs.writeFileSync(trfFilePath, input)
  fs.writeFileSync(outputFilePath, '')

  return new Promise((resolve, reject) => {
    let javafoCommand

    if (type === 'Circlechess_Online') {
      // The executable
      const exe = bbpPairingFile

      // Arguments as array — no spaces, each arg is separate!
      const args = ['--dutch', trfFilePath, '-p', outputFilePath]

      javafoCommand = spawn(exe, args)
      isBbpPairing = true
    } else {
      javafoCommand = spawn('java', [
        '-ea',
        '-Xms4G',
        '-Xmx4G',
        '-XX:+UseG1GC',
        '-XX:+TieredCompilation',
        '-XX:TieredStopAtLevel=1',
        '-noverify',
        '-jar',
        javafoJarPath,
        trfFilePath,
        '-p',
        outputFilePath,
      ])
    }

    javafoCommand.stdout.on('data', (data) => {
      console.error('Pairing Output', data.toString())
    })

    javafoCommand.on('close', (code) => {
      console.log(
        `${
          isBbpPairing ? 'bbpPairing' : 'JavaFo'
        } process exited with code ${code}`
      )
      if (!config.simulate && config.env === 'production') {
        uploadFileToS3(
          trfFilePath,
          process.env.AWS_S3_BUCKET_NAME,
          `pairings/input_${fileName}.trf`
        )
        uploadFileToS3(
          outputFilePath,
          process.env.AWS_S3_BUCKET_NAME,
          `pairings/output_${fileName}.trf`
        )
      }
      if (code === 0) {
        fs.readFile(outputFilePath, 'utf8', (err, data) => {
          if (!err) {
            // Split the file content into lines
            const lines = data.trim().split('\n')
            const whitePlayers = []
            const blackPlayers = []
            const leftTeams = []
            const rightTeams = []
            // Process each line of data
            lines.forEach((line, index) => {
              if (index > 0) {
                const [pIndex, oppIndex] = line.split(' ')
                if (Number(pIndex) > 0) {
                  const value = players.find((p) => {
                    return p.key === Number(pIndex)
                  })
                  const teamId = teams.find((t) => {
                    return t.player_uuids.includes(value.player_id)
                  })?.id
                  delete value?.id
                  whitePlayers.push(value)
                  if (!leftTeams.includes(teamId)) {
                    leftTeams.push(teamId)
                  }
                }
                if (Number(oppIndex) > 0) {
                  const value = players.find((p) => {
                    return p.key === Number(oppIndex)
                  })
                  const teamId = teams.find((t) => {
                    return t.player_uuids.includes(value.player_id)
                  })?.id
                  delete value?.id
                  blackPlayers.push(value)
                  if (!rightTeams.includes(teamId)) {
                    rightTeams.push(teamId)
                  }
                }
              }
            })
            resolve({ whitePlayers, blackPlayers, leftTeams, rightTeams })
          } else {
            reject(err)
          }
        })
      } else {
        console.error(`JaVaFo failed with code ${code}\n`)
        reject(new Error(`Pairing not generated from JavaFo engine`))
      }
    })
  })
}

async function callLambdaWithRetry(
  payload,
  urls,
  maxRetries = 1,
  timeoutMs = 300000
) {
  let lastError

  for (const url of urls) {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => {
        return controller.abort()
      }, timeoutMs)

      try {
        console.log(`Attempt ${attempt + 1} to call ${url}`)
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeout)
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`)
        }

        return await res.json() // or res.text(), etc.
      } catch (err) {
        lastError = err
        clearTimeout(timeout)
        // If last retry attempt on this URL, break and try next URL
        if (attempt === maxRetries) {
          break
        }
      }
    }
  }

  // All URLs and retries failed
  throw lastError
}

const pair = async (
  input,
  players,
  teams = [],
  fileName = '',
  engine = 'javafo'
) => {
  console.log('inside pair')
  const trfFilePath = `uploads/files/input_${fileName}.trf` // Path to your input TRF file
  fs.writeFileSync(trfFilePath, input)

  const fileBuffer = fs.readFileSync(trfFilePath)

  if (!config.simulate && config.env === 'production') {
    uploadFileToS3(
      trfFilePath,
      process.env.AWS_S3_BUCKET_NAME,
      `pairings/input_${fileName}.trf`
    )
  }

  // Convert to base64 string
  const base64String = fileBuffer.toString('base64')

  const payload = {
    trfFile: base64String,
    players,
    teams,
    fileName,
  }

  const urls = [
    config.awsLambdaJavafo, // primary
    config.awsLambdaBbpPairing, // fallback
  ]

  if (engine === 'bbpPairing') {
    urls.reverse() // Reverse the order for bbpPairing to try fallback first
  }

  try {
    const result = await callLambdaWithRetry(payload, urls)
    console.log('Lambda response:', JSON.stringify(result))
    if (result?.body) {
      return JSON.parse(result.body)
    }
    return result
  } catch (error) {
    console.error('Lambda failed after all retries and fallback:', error)
  }
}
module.exports = { pair, pairOld }
