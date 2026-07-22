"use client";

import React, { createContext, useContext, useState } from "react";
import axios from "axios";
import type { FullUserProfile, SystemRole } from "@/lib/services/role";

interface AuthContextType {
  /** The full authenticated user profile containing base info and role-specific details */
    user: FullUserProfile | null;
  /** Convenience shortcut for active role ("Admin" | "Support Manager" | "Technician" | "ClientUser") */
    role: SystemRole | null;
  /** Loading state during client re-validation */
    isLoading: boolean;
  /** Function to trigger a fresh background fetch of user profile & role */
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
    children: React.ReactNode;
  /** Server-hydrated initial user profile from Dashboard Layout */
    initialUser?: FullUserProfile | null;
}

export function AuthProvider({ children, initialUser = null }: Readonly<AuthProviderProps>) {
    const [user, setUser] = useState<FullUserProfile | null>(initialUser);
    const [isLoading, setIsLoading] = useState<boolean>(!initialUser);

    const refreshUser = async () => {
    try {
        setIsLoading(true);
        const response = await axios.get<{ success: boolean; user?: FullUserProfile }>("/api/auth/me");
        if (response.data.success && response.data.user) {
                setUser(response.data.user);
        } else {
            setUser(null);
        }
            } catch {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                role: user?.role ?? null,
                isLoading,
                refreshUser,
                }}
            >
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom hook to consume the AuthContext anywhere in client components
 * Usage: const { user, role, refreshUser } = useAuth();
 */
    export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
