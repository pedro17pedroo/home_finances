#!/usr/bin/env node

// Simple script to run the plans seed
import { spawn } from 'child_process';

const child = spawn('tsx', ['server/seeds/index.ts'], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  process.exit(code);
});