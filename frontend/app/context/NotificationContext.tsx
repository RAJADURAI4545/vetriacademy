import * as React from "react";
import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { ToastContainer } from "../components/Toast";
import type { ToastType } from "../components/Toast";

interface NotificationContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </NotificationContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useToast must be used within a NotificationProvider");
    }
    return context;
};
