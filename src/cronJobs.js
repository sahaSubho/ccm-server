/* eslint-disable no-shadow */
/* eslint-disable no-restricted-syntax */
const cron = require('node-cron')
const { Worker } = require('worker_threads')
const runSimulationTask = require('../simulation/worker')

cron.schedule('0 17 * * *', () => {
  console.log('cron started for fetching fide players')
  // Spawn a new worker thread to handle the task
  const worker = new Worker('./src/worker.js')

  // Send data to the worker if needed
  worker.postMessage({ info: 'Data for the worker' })

  // Listen for messages from the worker
  worker.on('message', (message) => {
    console.log('Message from worker:', message)
    // worker.terminate()
  })

  // Handle worker errors
  worker.on('error', (error) => {
    console.error('Worker error:', error)
    worker.terminate()
  })

  // Handle worker exit
  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Worker stopped with exit code ${code}`)
    }
  })
})


cron.schedule('0 20 * * 1,4', () => {
  runSimulationTask()
})