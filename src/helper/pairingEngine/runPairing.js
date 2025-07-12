// runPairingInWorker.js
const { Worker } = require('worker_threads')
const path = require('path')

function runPairing(input, players, teams = [], fileName = '') {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, './pairing.worker.js'))
    console.log('Worker started')

    worker.postMessage({ input, players, teams, fileName })

    worker.on('message', (message) => {
      if (message.status === 'success') {
        resolve(message.result)
      } else {
        console.log('Worker error:', JSON.stringify(message))
        reject(message)
      }
    })

    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}

module.exports = runPairing
