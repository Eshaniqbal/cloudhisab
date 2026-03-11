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
        const hasToken = !!getToken();
        const hasRT = !!localStorage.getItem("refresh_token");
        // If expired AND we have a way to refresh, do it.
        // Otherwise just try with whatever we have (or nothing).
        if (hasToken && isTokenExpired() && hasRT) {
            token = await getValidToken();
        } else {
            token = getToken();
        }
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

    // Do NOT intercept auth mutations (login/register/etc) as they handle 
    // their own errors and shouldn't trigger redirects or silent retires.
    const publicOps = ["Login", "RegisterTenant", "VerifyOtp", "RespondToNewPasswordChallenge", "ForgotPassword"];
    if (publicOps.includes(operation.operationName || "")) return;

    const hasAuthError = graphQLErrors.some(
        e => e.extensions?.code === "UNAUTHORIZED" ||
            e.message?.toLowerCase().includes("not authenticated") ||
            e.message?.toLowerCase().includes("unauthorized")
    );

    if (!hasAuthError) return;
    
    // Prevent infinite loops: if this operation has already been retried once,
    // and still fails with auth error, just log out.
    const context = operation.getContext();
    if (context.hasRetried) {
        logout();
        return;
    }

    // Return an Observable that refreshes then retries
    return new Observable<FetchResult>(observer => {
        getValidToken().then(newToken => {
            const currentToken = getToken();
            if (!newToken || newToken === currentToken) {
                // If no new token or it didn't actually change, we can't recover
                logout();
                observer.error(new Error("Session expired. Please sign in again."));
                return;
            }
            // Patch the auth header with the fresh token and mark as retried
            operation.setContext({
                headers: { 
                    ...context.headers, 
                    authorization: `Bearer ${newToken}` 
                },
                hasRetried: true
            });
            // Retry the operation
            const sub = forward(operation).subscribe(observer);
            return () => sub.unsubscribe();
        }).catch(e => {
            logout();
            observer.error(e);
        });
    });
});

export const apolloClient = new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: { fetchPolicy: "cache-and-network" },
    },
});
