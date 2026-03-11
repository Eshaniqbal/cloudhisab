/**
 * lib/auth.ts
 * -----------
 * Auth helpers: save/get/clear tokens, token-expiry check, Cognito refresh.
 */

import {
    CognitoUserPool,
    CognitoUser,
    CognitoRefreshToken,
} from "amazon-cognito-identity-js";

export interface AuthUser {
    tenantId: string;
    userId: string;
    email: string;
    role: string;
    businessName: string;
}

const TOKEN_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "ch_user";
const EXP_KEY = "token_exp"; // unix seconds

// ── Cognito pool (same IDs used in registration) ──────────────────────────
const POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";

function getUserPool() {
    if (!POOL_ID || !CLIENT_ID) return null;
    return new CognitoUserPool({ UserPoolId: POOL_ID, ClientId: CLIENT_ID });
}

// ── Persisted auth ─────────────────────────────────────────────────────────

export function saveAuth(
    token: string,
    user: AuthUser,
    refreshToken?: string,
    expiresIn: number = 3600,
) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    const expAt = Math.floor(Date.now() / 1000) + expiresIn - 60; // 60s buffer
    localStorage.setItem(EXP_KEY, String(expAt));
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
}

export function getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn(): boolean {
    return !!getToken();
}

/** Update individual fields in the stored user — e.g. after a settings save. */
export function patchUser(patch: Partial<AuthUser>) {
    const current = getUser();
    if (!current) return;
    const updated = { ...current, ...patch };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    // Fire a custom event so Sidebar (and any other listener) can reactively update
    window.dispatchEvent(new CustomEvent("ch:user-updated", { detail: updated }));
}

export function isTokenExpired(): boolean {
    if (typeof window === "undefined") return false;
    const exp = localStorage.getItem(EXP_KEY);
    if (!exp) return false; // no exp stored — treat as valid (legacy)
    return Date.now() / 1000 > Number(exp);
}

export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXP_KEY);
    window.location.href = "/login";
}

// ── Token Refresh ──────────────────────────────────────────────────────────
let _refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the Cognito access token using the stored refresh token.
 * Returns the new access token, or null if refresh fails.
 * Multiple concurrent callers share the same in-flight promise.
 */
export async function refreshAccessToken(): Promise<string | null> {
    if (_refreshPromise) return _refreshPromise;

    _refreshPromise = _doRefresh().finally(() => {
        _refreshPromise = null;
    });

    return _refreshPromise;
}

async function _doRefresh(): Promise<string | null> {
    try {
        const rt = getRefreshToken();
        const user = getUser();
        const pool = getUserPool();

        if (!rt || !user?.email || !pool) return null;

        return new Promise<string | null>((resolve) => {
            const cognitoUser = new CognitoUser({ Username: user.email, Pool: pool });
            const refreshToken = new CognitoRefreshToken({ RefreshToken: rt });

            cognitoUser.refreshSession(refreshToken, (err, session) => {
                if (err || !session) {
                    console.warn("[auth] Token refresh failed:", err?.message);
                    resolve(null);
                    return;
                }
                const newToken = session.getIdToken().getJwtToken();
                const exp = session.getIdToken().getExpiration();
                const expIn = exp - Math.floor(Date.now() / 1000);

                localStorage.setItem(TOKEN_KEY, newToken);
                localStorage.setItem(EXP_KEY, String(exp - 60));
                // refresh token rotates; update if a new one was issued
                const newRt = session.getRefreshToken().getToken();
                if (newRt) localStorage.setItem(REFRESH_KEY, newRt);

                resolve(newToken);
            });
        });
    } catch (e) {
        console.warn("[auth] Token refresh error:", e);
        return null;
    }
}

/**
 * Get a valid token — refreshes automatically if expired.
 * Use this instead of `getToken()` in Apollo links.
 */
export async function getValidToken(): Promise<string | null> {
    if (isTokenExpired()) {
        const fresh = await refreshAccessToken();
        if (!fresh) {
            // Refresh failed — just return null so the request fails with 401
            // or the link can handle it. DO NOT call logout() here as it
            // can break the login flow itself.
            return null;
        }
        return fresh;
    }
    return getToken();
}
