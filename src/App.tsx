import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { SessionProvider, useSession } from "./context/SessionContext";
import { countUnreadNotifications } from "./mock/api";
import { HomePage } from "./pages/HomePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SlotListPage } from "./pages/SlotListPage";
import { SlotDetailsPage } from "./pages/SlotDetailsPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { NotificationsPage } from "./pages/NotificationsPage";

function NotificationsNavLink() {
  const { clientId } = useSession();
  const unread = countUnreadNotifications(clientId);
  return (
    <NavLink to="/notifications">
      Уведомления{unread > 0 && <span className="nav-badge">{unread}</span>}
    </NavLink>
  );
}

// Кабинет — то, что видно после входа: шапка с навигацией + сами страницы.
function Cabinet() {
  const { clientName, logout } = useSession();
  return (
    <>
      <header className="nav">
        <span className="nav__logo">Глина</span>
        <nav>
          <NavLink to="/" end>
            Занятия
          </NavLink>
          <NavLink to="/bookings">Мои записи</NavLink>
          <NotificationsNavLink />
          <NavLink to="/profile">Профиль</NavLink>
        </nav>
        <div className="nav__user">
          <span>{clientName}</span>
          <button className="link-button" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<SlotListPage />} />
          <Route path="/slots/:slotId" element={<SlotDetailsPage />} />
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

// До входа доступны только лендинг и форма входа — вся остальная навигация ведёт на лендинг.
function Landing() {
  return (
    <Routes>
      <Route path="/login" element={<RegisterPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

function Root() {
  const { isLoggedIn } = useSession();
  return isLoggedIn ? <Cabinet /> : <Landing />;
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </SessionProvider>
  );
}
