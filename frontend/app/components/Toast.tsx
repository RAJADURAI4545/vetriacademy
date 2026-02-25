import * as React from "react";
import { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const colors = {
        success: { bg: "#10B981", icon: "✓" },
        error: { bg: "#EF4444", icon: "✕" },
        info: { bg: "#3B82F6", icon: "ℹ" }
    };

    const color = colors[type];

    return (
        <div className="toast-item fade-in-toast">
            <div className="toast-icon" style={{ background: color.bg }}>{color.icon}</div>
            <div className="toast-message">{message}</div>
            <button className="toast-close" onClick={onClose}>×</button>
            <style>{`
                .toast-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    background: #1A1F2E;
                    border: 1px solid #2D3748;
                    border-left: 4px solid ${color.bg};
                    border-radius: 12px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    color: #F1F5F9;
                    min-width: 300px;
                    max-width: 450px;
                    pointer-events: auto;
                    margin-bottom: 8px;
                }
                .toast-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-weight: bold;
                    font-size: 12px;
                    flex-shrink: 0;
                }
                .toast-message {
                    flex: 1;
                    font-size: 14px;
                    font-weight: 500;
                }
                .toast-close {
                    background: transparent;
                    border: none;
                    color: #64748B;
                    font-size: 20px;
                    cursor: pointer;
                    line-height: 1;
                    padding: 4px;
                }
                .toast-close:hover { color: #F1F5F9; }
                .fade-in-toast {
                    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes slideIn {
                    from { transform: translateX(100%) scale(0.9); opacity: 0; }
                    to { transform: translateX(0) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

interface ToastContainerProps {
    toasts: { id: number; message: string; type: ToastType }[];
    removeToast: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
            ))}
            <style>{`
                .toast-container {
                    position: fixed;
                    top: 24px;
                    right: 24px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    pointer-events: none;
                    gap: 8px;
                }
            `}</style>
        </div>
    );
};
