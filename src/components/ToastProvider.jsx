import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext({
  showToast: () => {},
});

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const timersRef = useRef({});

  const showToast = useCallback((message, duration = 2500) => {
    const id = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setItems((prev) => {
      const next = [...prev, { id, message }];
      const limited = next.slice(-3);
      if (limited[0] && limited[0].id !== next[0].id) {
        const removed = next.filter((item) => !limited.includes(item));
        removed.forEach((item) => {
          const timer = timersRef.current[item.id];
          if (timer) clearTimeout(timer);
          delete timersRef.current[item.id];
        });
      }
      return limited;
    });
    timersRef.current[id] = setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      delete timersRef.current[id];
    }, duration);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {items.map((toast) => (
          <div key={toast.id} className="toast-item">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
