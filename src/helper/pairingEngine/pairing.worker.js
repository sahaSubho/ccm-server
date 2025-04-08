// pairing.worker.js
const { parentPort } = require('worker_threads')
const pair = require('.')

parentPort.on('message', async ({ input, players, teams, fileName }) => {
  try {
    const result = await pair(input, players, teams, fileName)
    parentPort.postMessage({ status: 'success', result })
  } catch (err) {
    parentPort.postMessage({ status: 'error', error: err.message || err.toString() })
  }
})
