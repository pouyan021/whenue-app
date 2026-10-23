import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

import { config } from './config';

export function createApolloClient(uri: string = config.graphqlUrl) {
  return new ApolloClient({
    link: new HttpLink({ uri }),
    cache: new InMemoryCache(),
  });
}
