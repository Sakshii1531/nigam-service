// supertest's `request(app)` starts the app with `listen(0)` — every interface,
// IPv6 `::` included — and then connects to 127.0.0.1:<port>. On macOS another
// program may already hold that same port number on 127.0.0.1 alone (local dev
// tooling opens many ephemeral loopback ports); both binds succeed, and the
// test's request lands on the other program. That showed up as random 401 /
// 404 / 400 responses in the middle of logins, only under long multi-file runs.
//
// Binding the test server to 127.0.0.1 itself makes the OS hand out a port that
// is free there, so supertest (which reuses a listening server's address)
// always reaches the app.
export function listenOnLoopback(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

export function closeServer(server) {
  return new Promise((resolve) => (server?.listening ? server.close(() => resolve()) : resolve()));
}
