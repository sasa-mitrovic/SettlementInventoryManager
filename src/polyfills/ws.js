// Browser polyfill for ws module - provides WebSocket implementation for browser
const WebSocket = globalThis.WebSocket;

// Create a constructor function that matches the ws module API
function WSPolyfill(url, protocols, options) {
  return new WebSocket(url, protocols);
}

// Add static properties that ws module might have
WSPolyfill.WebSocket = WebSocket;
WSPolyfill.CONNECTING = WebSocket.CONNECTING;
WSPolyfill.OPEN = WebSocket.OPEN;
WSPolyfill.CLOSING = WebSocket.CLOSING;
WSPolyfill.CLOSED = WebSocket.CLOSED;

export default WSPolyfill;
export { WSPolyfill as WebSocket };
