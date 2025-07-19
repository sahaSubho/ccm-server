const { spawn } = require('child_process')
const fs = require('fs')
const uploadFileToS3 = require('../uploadFiletoS3')
const config = require('../../config/config')

const pairOld = (input, players, teams = [], fileName = '') => {
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
    // let javafoCommand

    // if (players.length > 500) {
    // The executable
    const exe = bbpPairingFile

    // Arguments as array — no spaces, each arg is separate!
    const args = ['--dutch', trfFilePath, '-p', outputFilePath]

    const javafoCommand = spawn(exe, args)
    isBbpPairing = true
    // } else {
    //   javafoCommand = spawn('java', [
    //     '-ea',
    //     '-Xms4G',
    //     '-Xmx4G',
    //     '-XX:+UseG1GC',
    //     '-XX:+TieredCompilation',
    //     '-XX:TieredStopAtLevel=1',
    //     '-noverify',
    //     '-jar',
    //     javafoJarPath,
    //     trfFilePath,
    //     '-p',
    //     outputFilePath,
    //   ])
    // }

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

const pair = async (input, players, teams = [], fileName = '') => {
  console.log('inside pair')
  const trfFilePath = `uploads/files/input_${fileName}.trf` // Path to your input TRF file
  fs.writeFileSync(trfFilePath, input)

  const fileBuffer = fs.readFileSync(trfFilePath)

  // Convert to base64 string
  const base64String = fileBuffer.toString('base64')

  const payload = {
    trfFile: base64String,
    players,
    teams,
    fileName,
  }

  console.log(config.awsLambdaUrl, JSON.stringify(payload))
  const res = await fetch(config.awsLambdaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  console.log('result', JSON.stringify(res.status))
  const result = await res.json()
  return result
}
module.exports = pair
