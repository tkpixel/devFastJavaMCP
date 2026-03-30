import { spawn } from 'child_process';

async function testServer() {
  const server = spawn('node', ['./dist/index.js']);
  let stdoutData = '';
  let stderrData = '';

  server.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  server.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  // Give it a second to start
  await new Promise((resolve) => setTimeout(resolve, 2000));

  server.kill();

  console.log('--- STDOUT ---');
  console.log(stdoutData);
  console.log('--- STDERR ---');
  console.log(stderrData);

  // STDOUT should be empty or contain only MCP protocol messages
  // In a clean start without input, it might be empty
  if (stdoutData.trim() === '' || stdoutData.startsWith('{')) {
    console.log('SUCCESS: STDOUT is clean or contains JSON protocol messages.');
  } else {
    console.error('FAILURE: STDOUT contains non-JSON output!');
    process.exit(1);
  }

  if (stderrData.includes('[INFO] DevFast Java MCP Server running on stdio')) {
    console.log('SUCCESS: Server started and logged to STDERR.');
  } else {
    console.error('FAILURE: Server did not log startup message to STDERR.');
    process.exit(1);
  }
}

testServer();
