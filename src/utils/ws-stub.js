// WebSocket stub for browser compatibility
// This replaces the Node.js 'ws' module with browser-compatible WebSocket

// Use the browser's native WebSocket
const WebSocketImpl =
  globalThis.WebSocket ||
  class MockWebSocket {
    constructor() {
      console.warn('WebSocket not available in this environment');
    }

    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };

// Export default and named exports to match ws module API
export default WebSocketImpl;
export { WebSocketImpl as WebSocket };

// Constants that ws module might expose
export const CONNECTING = 0;
export const OPEN = 1;
export const CLOSING = 2;
export const CLOSED = 3;
