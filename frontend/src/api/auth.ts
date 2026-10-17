import apiClient from "./client";

export interface RegisterPayload {
  email: string;
  password: string;
  fullName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  fullName?: string | null; // login/verify/google ne renvoient pas fullName, seulement /me
  role: string;
}

interface AuthResponse {
  user: User;
}

export const registerUser = (payload: RegisterPayload) =>
  apiClient<{ message: string; email: string }>("/auth/register", {
    method: "POST",
    body: payload,
  });

export const loginUser = (payload: LoginPayload) =>
  apiClient<AuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });

export const logoutUser = () =>
  apiClient<{ message: string }>("/auth/logout", { method: "POST" });

export const getCurrentUser = () =>
  apiClient<{ user: User }>("/auth/me", { method: "GET" });

export const verifyEmail = (email: string, code: string) =>
  apiClient<AuthResponse>("/auth/verify-email", {
    method: "POST",
    body: { email, code },
  });

export const resendCode = (email: string) =>
  apiClient<{ message: string }>("/auth/resend-code", {
    method: "POST",
    body: { email },
  });

export const googleLogin = (idToken: string) =>
  apiClient<AuthResponse>("/auth/google", {
    method: "POST",
    body: { idToken },
  });