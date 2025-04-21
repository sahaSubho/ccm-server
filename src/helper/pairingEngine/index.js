const { spawn } = require('child_process')
const fs = require('fs')
const uploadFileToS3 = require("../uploadFiletoS3")

const pair = (input, players, teams = [], fileName = '') => {
  const javafoJarPath = 'src/helper/pairingEngine/files/javafo.jar' // Path to javafo.jar in your project
  const trfFilePath = `uploads/files/input_${fileName}.trf` // Path to your input TRF file
  const outputFilePath = `uploads/files/output_${fileName}.trf` // Path to the output file

  if (!fs.existsSync('uploads/files')) {
    fs.mkdirSync('uploads/files', { recursive: true })
  }

  fs.writeFileSync(trfFilePath, input)
  fs.writeFileSync(outputFilePath, '')

  let stderrData = ''
  return new Promise((resolve, reject) => {
    const javafoCommand = spawn('java', [
      '-ea',
      '-Xmx10240m',
      '-XX:+HeapDumpOnOutOfMemoryError',
      '-jar',
      javafoJarPath,
      trfFilePath,
      '-p',
      outputFilePath,
    ],{cwd: process.cwd()})

    javafoCommand.stdout.on('data', (data) => {
      console.log('[Java STDOUT]', data.toString())
    })

    javafoCommand.stderr.on('data', (data) => {
      console.error('[Java STDERR]', data.toString())
      stderrData += data.toString()
    })

    javafoCommand.on('close', (code) => {
      console.log(`JaVaFo process exited with code ${code}`)
      uploadFileToS3(trfFilePath, process.env.AWS_S3_BUCKET_NAME, `pairings/input_${fileName}.trf`)
      uploadFileToS3(outputFilePath, process.env.AWS_S3_BUCKET_NAME, `pairings/output_${fileName}.trf`)
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
        reject(new Error(`JaVaFo failed with code ${code}:\n${stderrData}`))
      }
    })
  })
}

module.exports = pair
