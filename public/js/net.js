// Tiny WebSocket wrapper that keeps reconnecting. Messages are JSON objects
// with a `t` (type) field; `onOpen` runs after every (re)connect.
export function connect({ onOpen, onMessage, onStatus }) {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  let ws;
  let retries = 0;
  let retryTimer = null;

  function open() {
    clearTimeout(retryTimer);
    ws = new WebSocket(`${protocol}://${location.host}/ws`);
    ws.onopen = () => {
      retries = 0;
      onStatus?.('online');
      onOpen?.();
    };
    ws.onmessage = e => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      onMessage(msg);
    };
    ws.onclose = () => {
      onStatus?.('offline');
      retryTimer = setTimeout(open, Math.min(500 * 2 ** retries++, 4000));
    };
  }

  // Coming back from a locked screen: don't wait for the backoff timer.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ws.readyState === WebSocket.CLOSED) open();
  });

  open();

  return {
    send(msg) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
  };
}
