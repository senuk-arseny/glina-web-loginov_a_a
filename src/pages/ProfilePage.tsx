import { getClientProfile } from "../mock/api";
import { useSession } from "../context/SessionContext";
import { ThrowingRings } from "../components/ThrowingRings";

// Простое склонение слова "посещение" для прогресса к статусу.
function pluralizeVisits(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "посещение";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "посещения";
  return "посещений";
}

export function ProfilePage() {
  const { clientId } = useSession();
  const profile = getClientProfile(clientId);
  const visitsLeft = Math.max(0, 3 - profile.visitedCount);

  return (
    <div className="fill-page">
      <ThrowingRings className="throwing-rings--ambient" />
      <div className="profile-card">
        <div className="profile-card__avatar">{profile.name.charAt(0).toUpperCase()}</div>
        <h1>{profile.name}</h1>
        <p className="muted">{profile.contact}</p>

        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat__value">{profile.visitedCount}</span>
            <span className="profile-stat__label">Посещений</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__value">{profile.lateCancellationCount}</span>
            <span className="profile-stat__label">Поздних отмен</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__value">{profile.isRegular ? "★" : "—"}</span>
            <span className="profile-stat__label">Статус</span>
          </div>
        </div>

        {profile.isRegular ? (
          <span className="badge badge--regular">Постоянный клиент</span>
        ) : (
          <div className="profile-progress">
            <div className="profile-progress__track">
              <div
                className="profile-progress__fill"
                style={{ width: `${Math.min(100, (profile.visitedCount / 3) * 100)}%` }}
              />
            </div>
            <p className="muted">
              Ещё {visitsLeft} {pluralizeVisits(visitsLeft)} до статуса «Постоянный клиент»
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
