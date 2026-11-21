const http = require('http');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class MiniWebSocket extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.readyState = 1;
    this._buffer = Buffer.alloc(0);
    this._fragments = [];

    socket.on('data', (data) => this._onData(data));
    socket.on('close', () => {
      if (this.readyState !== 3) {
        this.readyState = 3;
        this.emit('close');
      }
    });
    socket.on('error', (err) => {
      if (this.readyState !== 3) {
        this.readyState = 3;
        this.emit('error', err);
      }
    });
  }

  _onData(data) {
    this._buffer = Buffer.concat([this._buffer, data]);
    this._processBuffer();
  }

  _processBuffer() {
    while (this._buffer.length >= 2) {
      const firstByte = this._buffer[0];
      const secondByte = this._buffer[1];

      const fin = (firstByte & 0x80) !== 0;
      const opcode = firstByte & 0x0F;
      const masked = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7F;

      let offset = 2;

      if (payloadLength === 126) {
        if (this._buffer.length < 4) return;
        payloadLength = this._buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (this._buffer.length < 10) return;
        payloadLength = Number(this._buffer.readBigUInt64BE(2));
        offset = 10;
      }

      let mask = null;
      if (masked) {
        if (this._buffer.length < offset + 4) return;
        mask = Buffer.from(this._buffer.slice(offset, offset + 4));
        offset += 4;
      }

      if (this._buffer.length < offset + payloadLength) return;

      let payload = Buffer.from(this._buffer.slice(offset, offset + payloadLength));

      if (masked && mask) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= mask[i % 4];
        }
      }

      this._buffer = this._buffer.slice(offset + payloadLength);

      if (opcode === 0x0) {
        this._fragments.push(payload);
        if (fin) {
          const fullPayload = Buffer.concat(this._fragments);
          this._fragments = [];
          this.emit('message', fullPayload.toString('utf8'));
        }
      } else if (opcode === 0x1) {
        if (fin) {
          this.emit('message', payload.toString('utf8'));
        } else {
          this._fragments = [payload];
        }
      } else if (opcode === 0x8) {
        this.close();
      } else if (opcode === 0x9) {
        this._sendFrame(0xA, payload);
      }
    }
  }

  send(data) {
    if (this.readyState !== 1) return;
    if (typeof data !== 'string') data = JSON.stringify(data);
    this._sendFrame(0x1, Buffer.from(data, 'utf8'));
  }

  _sendFrame(opcode, payload) {
    const headerBytes = [0x80 | opcode];

    if (payload.length < 126) {
      headerBytes.push(payload.length);
    } else if (payload.length < 65536) {
      headerBytes.push(126);
      const lenBuf = Buffer.alloc(2);
      lenBuf.writeUInt16BE(payload.length, 0);
      headerBytes.push(lenBuf[0], lenBuf[1]);
    } else {
      headerBytes.push(127);
      const lenBuf = Buffer.alloc(8);
      lenBuf.writeBigUInt64BE(BigInt(payload.length), 0);
      for (let i = 0; i < 8; i++) headerBytes.push(lenBuf[i]);
    }

    const header = Buffer.from(headerBytes);
    this.socket.write(Buffer.concat([header, payload]));
  }

  close() {
    if (this.readyState >= 2) return;
    this.readyState = 2;
    try {
      this._sendFrame(0x8, Buffer.alloc(0));
    } catch (e) {
      // ignore
    }
    this.socket.end();
    this.readyState = 3;
    this.emit('close');
  }
}

class MiniWebSocketServer extends http.Server {
  constructor(options, callback) {
    super();

    this.options = options || {};

    this.on('upgrade', (req, socket) => {
      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.destroy();
        return;
      }

      const accept = crypto
        .createHash('sha1')
        .update(key + GUID)
        .digest('base64');

      const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + accept,
        '',
        '',
      ];

      socket.write(responseHeaders.join('\r\n'));

      const ws = new MiniWebSocket(socket);
      if (callback) callback(ws, req);
      this.emit('connection', ws, req);
    });

    if (this.options.port) {
      this.listen(this.options.port);
    }
  }
}

module.exports = { WebSocketServer: MiniWebSocketServer, WebSocket: MiniWebSocket };
