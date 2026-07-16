// Singleton getter/setter for the Socket.IO server instance, set once by
// initSockets() in server.js. Domain services (e.g. notification.service.js)
// import getIO() rather than socket gateways importing domain services —
// avoids a circular-import tangle between src/sockets/ and src/modules/.
let io = null;

export function setIO(instance) {
  io = instance;
}

export function getIO() {
  return io;
}
