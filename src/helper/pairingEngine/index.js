const { spawn } = require('child_process')
const fs = require('fs')

const pair = (input, players, fileName) => {
  const javafoJarPath = 'src/helper/pairingEngine/files/javafo.jar' // Path to javafo.jar in your project
  const trfFilePath = `uploads/files/input_${fileName}.trf` // Path to your input TRF file
  const outputFilePath = `uploads/files/output_${fileName}.trf` // Path to the output file

  fs.writeFileSync(trfFilePath, input)
  fs.writeFileSync(outputFilePath, '')

  return new Promise((resolve, reject) => {
    const javafoCommand = spawn('java', [
      '-ea',
      '-jar',
      javafoJarPath,
      trfFilePath,
      '-p',
      outputFilePath,
    ])

    javafoCommand.stdout.on('data', (data) => {
      console.log(`JaVaFo output: ${data}`)
    })

    javafoCommand.stderr.on('data', (data) => {
      reject(data)
    })

    javafoCommand.on('close', (code) => {
      console.log(`JaVaFo process exited with code ${code}`)
      if (code === 0) {
        fs.readFile(outputFilePath, 'utf8', (err, data) => {
          if (!err) {
            // Split the file content into lines
            const lines = data.trim().split('\n')
            const whitePlayers = []
            const blackPlayers = []
            // Process each line of data
            lines.forEach((line, index) => {
              if (index > 0) {
                const [pIndex, oppIndex] = line.split(' ')
                if (Number(pIndex) > 0) {
                  const value = players.find((p) => {
                    return p.key === Number(pIndex)
                  })
                  delete value?.id
                  whitePlayers.push(value)
                }
                if (Number(oppIndex) > 0) {
                  const value = players.find((p) => {
                    return p.key === Number(oppIndex)
                  })
                  delete value?.id
                  blackPlayers.push(value)
                }
              }
            })
            resolve({ whitePlayers, blackPlayers })
          } else {
            reject(err)
          }
        })
      } else {
        reject(code)
      }
    })
  })
}

module.exports = pair
