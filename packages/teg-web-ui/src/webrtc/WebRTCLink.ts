import { ApolloLink, Operation, FetchResult, Observable } from '@apollo/client'
import { print, GraphQLError } from 'graphql'
import { createClient, Client } from 'graphql-ws'

import WebRTCSocket from './WebRTCSocket'
import type { WebRTCOptions } from './WebRTCSocket'

const randomisedExponentialBackoff = async (retries) => {
  let retryDelay = 60_000; // start with 3s delay
  for (let i = 0; i < retries; i++) {
      retryDelay *= 2;
  }
  await new Promise((resolve) => setTimeout(resolve, retryDelay +
      // add random timeout from 300ms to 3s
      Math.floor(Math.random() * (3000 - 300) + 300)));
}

export default class WebRTCLink extends ApolloLink {
  private client: Client

  public constructor(options: WebRTCOptions) {
    super()

    this.client = createClient({
      // The URL is unused but it is required by ClientOptions
      url: 'webrtc://',
      // WebRTC connections are expensive to create
      keepAlive: Number.MAX_SAFE_INTEGER,
      retryWait: randomisedExponentialBackoff,
      webSocketImpl: WebRTCSocket(options),
    })
  }

  request(operation: Operation): Observable<FetchResult> {
    return new Observable((sink) => {
      return this.client.subscribe<FetchResult>(
        { ...operation, query: print(operation.query as any) },
        {
          next: sink.next.bind(sink),
          complete: sink.complete.bind(sink),
          error: (err) => {
            if (err instanceof Error) {
              sink.error(err)
            } else if (err instanceof CloseEvent) {
              sink.error(
                new Error(
                  `Socket closed with event ${err.code}` + err.reason
                    ? `: ${err.reason}` // reason will be available on clean closes
                    : '',
                ),
              )
            } else {
              sink.error(
                new Error(
                  (err as GraphQLError[])
                    .map(({ message }) => message)
                    .join(', '),
                ),
              )
            }
          },
        },
      )
    })
  }
}
