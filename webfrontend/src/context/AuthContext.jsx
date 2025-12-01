import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            if (authService.isAuthenticated()) {
                try {
                    const data = await authService.getCurrentUser();
                    setUser(data.user);
                } catch (err) {
                    console.error('Failed to load user:', err);
                    authService.logout();
                }
            }
            setLoading(false);
        };

        loadUser();
    }, []);

    const signup = async (name, email, password) => {
        try {
            setError(null);
            const data = await authService.signup(name, email, password);
            setUser(data.user);
            return data;
        } catch (err) {
            setError(err);
            throw err;
        }
    };

    const login = async (email, password) => {
        try {
            setError(null);
            const data = await authService.login(email, password);
            setUser(data.user);
            return data;
        } catch (err) {
            setError(err);
            throw err;
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const value = {
        user,
        loading,
        error,
        signup,
        login,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
