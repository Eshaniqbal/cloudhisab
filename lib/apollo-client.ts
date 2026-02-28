import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8000/graphql",
});

const authLink = setContext((_, { headers }) => {
    const token =
        typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
        },
    };
});

export const apolloClient = new ApolloClient({
    link: from([authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: { fetchPolicy: "cache-and-network" },
    },
});
