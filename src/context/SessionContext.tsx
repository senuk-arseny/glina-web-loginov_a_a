import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { loginOrRegister } from "../mock/api";

interface SessionContextValue {
  clientId: string;
  clientName: string;
  isLoggedIn: boolean;
  login: (name: string, phone: string) => void;
  logout: () => void;
}

const defaultValue: SessionContextValue = {
  clientId: "",
  clientName: "",
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
};

const SessionContext = createContext<SessionContextValue>(defaultValue);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");

  function login(name: string, phone: string) {
    // Вход "без SMS": имя + телефон достаточно, чтобы попасть в кабинет.
    // Один и тот же телефон всегда возвращает один и тот же профиль (см. mock/api.ts).
    const profile = loginOrRegister(name, phone);
    setClientId(profile.id);
    setClientName(profile.name);
  }

  function logout() {
    setClientId("");
    setClientName("");
  }

  return (
    <SessionContext.Provider
      value={{ clientId, clientName, isLoggedIn: !!clientId, login, logout }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
