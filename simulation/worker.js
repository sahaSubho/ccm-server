const cron = require('node-cron');
const { spawn, execSync } = require('child_process');
const http = require('http')
const path = require('path');

// Adjust this to the right path or import
const simulateAllTournamentFlows = require('./index');

let serverProcess = null;

function waitForServer(timeout = 10000) {
    console.log("Waiting to connect server")
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const req = http.get(`http://localhost:5002/`, res => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });

      req.on('error', retry);
      req.setTimeout(1000, retry);

      function retry() {
        console.log("Retrying")
        if (Date.now() - start > timeout) {
          reject(new Error('Server did not start in time.'));
        } else {
          setTimeout(check, 1000);
        }
      }
    };

    check();
  });
}

async function runSimulationTask() {
  console.log(`[${new Date().toISOString()}] Starting scheduled task...`);

  // Start server
  serverProcess = spawn('node', ['src/index.js'], {
    cwd: process.cwd(),
    env: {
        ...process.env,
        PORT: 5002,
        SIMULATION_MODE: true
    },
    detached: true,
    stdio: 'inherit'
  });
  console.log(JSON.stringify(serverProcess))
//   serverProcess.unref();

  try {
    // Wait until server is ready
    await waitForServer();
    console.log('Server is ready.');

    // Run the flow
    await simulateAllTournamentFlows();
    console.log('Tournament flow complete.');

  } catch (err) {
    console.error('Error in scheduled task:', err.message);
  } finally {
    // Kill the server process
    console.log("Killing the server")
    try {
      const pidToKeep = process.pid; // Current Node process (server on 5001)
      const cmd = `
        lsof -i:5002 -sTCP:LISTEN | awk '$1=="node" && $2 != ${pidToKeep} {print $2}' | xargs kill -9
      `;
      execSync(cmd, { stdio: 'inherit' });
      console.log('Killed Node process on port 5002');
    } catch (err) {
      console.error('Error killing process:', err.message);
    }
  }
}

// runSimulationTask()
module.exports = runSimulationTask