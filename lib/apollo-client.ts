import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    from,
    Observable,
    FetchResult,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { getToken, getValidToken, logout, isTokenExpired } from "./auth";

const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8000/graphql",
});

// ── Auth link: attach token to every request ──────────────────────────────
// Uses synchronous getToken() for speed; the error link below handles
// expired-token retries with async refresh.
const authLink = setContext(async (_, { headers }) => {
    let token: string | null = null;
    if (typeof window !== "undefined") {
        // If near-expiry, proactively refresh before the request fires
        token = isTokenExpired() ? await getValidToken() : getToken();
    }
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
        },
    };
});

// ── Error link: auto-refresh on 401, then retry once ─────────────────────
const errorLink = onError(({ graphQLErrors, operation, forward }) => {
    if (!graphQLErrors) return;

    const hasAuthError = graphQLErrors.some(
        e => e.extensions?.code === "UNAUTHORIZED" ||
            e.message?.toLowerCase().includes("not authenticated") ||
            e.message?.toLowerCase().includes("unauthorized"),
    );

    if (!hasAuthError) return;

    // Return an Observable that refreshes then retries
    return new Observable<FetchResult>(observer => {
        getValidToken().then(newToken => {
            if (!newToken) {
                logout();
                observer.error(new Error("Session expired. Please sign in again."));
                return;
            }
            // Patch the auth header with the fresh token
            const headers = operation.getContext().headers || {};
            operation.setContext({
                headers: { ...headers, authorization: `Bearer ${newToken}` },
            });
            // Retry the operation
            const sub = forward(operation).subscribe(observer);
            return () => sub.unsubscribe();
        }).catch(e => observer.error(e));
    });
});

export const apolloClient = new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: { fetchPolicy: "cache-and-network" },
    },
});
