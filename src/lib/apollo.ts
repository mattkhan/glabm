import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client/core";
import { getToken } from "./gitlab";
const gitLabApiUrl = "https://gitlab.com/api/graphql";

export default new ApolloClient({
  link: new HttpLink({
    uri: gitLabApiUrl,
    headers: { Authorization: `Bearer ${getToken()}` },
  }),
  cache: new InMemoryCache(),
});
