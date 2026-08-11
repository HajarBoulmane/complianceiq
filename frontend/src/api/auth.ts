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

interface AuthResponse {
  user: User;
  token: string;
}

export const registerUser = async (payload: RegisterPayload) => {
  const res = await apiClient<AuthResponse>("/auth/register", {
    method: "POST",
    body: payload,
  });
  localStorage.setItem("token", res.token);
  return res;
};

export const loginUser = async (payload: LoginPayload) => {
  const res = await apiClient<AuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
  localStorage.setItem("token", res.token);
  return res;
};

export const logoutUser = async () => {
  localStorage.removeItem("token");
  return apiClient<{ message: string }>("/auth/logout", {
    method: "POST",
  });
};

export const getCurrentUser = () =>
  apiClient<{ user: User }>("/auth/me", {
    method: "GET",
  });

export const verifyCode = (payload: { email: string; code: string }) =>
  apiClient<{ success: boolean }>("/auth/verify-email", {
    method: "POST",
    body: payload,
  });

export const googleLogin = async (idToken: string) => {
  const res = await apiClient<AuthResponse>("/auth/google", {
    method: "POST",
    body: { idToken },
  });
  localStorage.setItem("token", res.token);
  return res;
};