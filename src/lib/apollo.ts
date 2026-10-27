import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

import { config } from './config';

/**
 * A client for public operations, or for a member of one clinic's club when given their
 * token. Members sign in to each club separately and myMembership answers for whichever
 * token is sent, so each club gets its own client and cache.
 */
export function createApolloClient(uri: string = config.graphqlUrl, token?: string) {
  return new ApolloClient({
    link: new HttpLink({ uri, headers: token ? { Authorization: `Bearer ${token}` } : {} }),
    cache: new InMemoryCache(),
  });
}
