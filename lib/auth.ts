export interface AuthUser {
    tenantId: string;
    userId: string;
    email: string;
    role: string;
    businessName: string;
}

const TOKEN_KEY = "access_token";
const USER_KEY = "ch_user";

export function saveAuth(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn(): boolean {
    return !!getToken();
}

export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "/login";
}
