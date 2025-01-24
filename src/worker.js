const { parentPort } = require('worker_threads')
const syncUpdatedFidePlayersData = require('./helper/syncfidePlayers')

parentPort.on('message', async (data) => {
  // Perform the intensive task here
  console.log('Worker received data:', data)

  // Simulate a heavy task
  await syncUpdatedFidePlayersData()

  // Notify the main thread that the task is complete
  parentPort.postMessage('Task completed')
})
