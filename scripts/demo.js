process.env.DEMO_MODE = 'true';
process.env.HOST = '127.0.0.1';
await import('../src/server.js');
