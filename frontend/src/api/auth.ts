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
  fullName: string;
  role: string;
}

export const registerUser = (payload: RegisterPayload) =>
  apiClient<{ user: User }>("/auth/register", {
    method: "POST",
    body: payload,
  });

export const loginUser = (payload: LoginPayload) =>
  apiClient<{ user: User }>("/auth/login", {
    method: "POST",
    body: payload,
  });

export const logoutUser = () =>
  apiClient<{ message: string }>("/auth/logout", {
    method: "POST",
  });

export const getCurrentUser = () =>
  apiClient<{ user: User }>("/auth/me", {
    method: "GET",
  });