import EventEmitter from 'eventemitter3'

export const SOCKET_STATES = {
  CONNECTING: 'CONNECTING',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
}

const wrapInSocketAPI = (createConnection) => {
  let connection = null
  const socket = Object.assign(new EventEmitter(), {
    readyState: SOCKET_STATES.CONNECTING,
    send: (data) => {
      if (socket.readyState !== SOCKET_STATES.OPEN) {
        throw new Error('Cannot call send on a closed connection')
      }
      connection.send(data)
    },
    close: () => {
      // eslint-disable-next-line no-console
      console.log('close socket')
      if (connection != null) {
        connection.close()
      } else {
        socket.readyState = SOCKET_STATES.CLOSED
      }
    },
  })

  const onError = (error) => {
    socket.readyState = SOCKET_STATES.CLOSED

    if (socket.onerror == null && socket.listenerCount('error' === 0)) {
      throw new Error(error)
    }
    if (socket.onerror != null) {
      socket.onerror(error)
    }
    socket.emit('error', error)
  }

  const onConnection = (nextConnection) => {
    if (socket.readyState === SOCKET_STATES.CLOSED) {
      nextConnection.close()
      return
    }

    connection = nextConnection

    // set the state and relay an open event through the socket
    socket.readyState = SOCKET_STATES.OPEN

    if (socket.onopen != null) {
      socket.onopen()
    }

    socket.emit('open')

    // relay connection events through the socket API
    connection.on('data', (data) => {
      socket.onmessage({ data })
    })

    connection.on('close', () => {
      socket.readyState = SOCKET_STATES.CLOSED
      if (socket.onclose != null) {
        socket.onclose()
      }
      socket.emit('close')
    })

    connection.on('error', onError)
  }

  /*
   * mimic the websocket API
   */
  const socketImpl = (url, protocol) => {
    (async () => {
      try {
        const nextConnection = await createConnection({ url, protocol })
        onConnection(nextConnection)
      } catch (e) {
        onError(e)
      }
    })()

    return socket
  }

  // socketImpl is a websocket-compatible API
  Object.assign(socketImpl, SOCKET_STATES)

  return socketImpl
}

export default wrapInSocketAPI