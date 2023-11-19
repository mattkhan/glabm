import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { getToken } from "./gitlab";
const gitLabApiUrl = "https://gitlab.com/api/graphql";

export default new ApolloClient({
  uri: gitLabApiUrl,
  cache: new InMemoryCache(),
  headers: { Authorization: `Bearer ${getToken()}` },
});
