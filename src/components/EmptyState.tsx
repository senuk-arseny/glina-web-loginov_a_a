import { useNavigate } from "react-router-dom";
import { ThrowingRings } from "./ThrowingRings";

function BowlIcon() {
  return (
    <svg
      className="empty-page__icon"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M8 19h32c0 9.5-6.5 17-16 17S8 28.5 8 19Z" />
      <ellipse cx="24" cy="19" rx="16" ry="4.5" />
    </svg>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}

export function EmptyState({ title, description, actionLabel, actionTo }: EmptyStateProps) {
  const navigate = useNavigate();
  return (
    <div className="fill-page">
      <ThrowingRings className="throwing-rings--ambient" />
      <div className="empty-page__content">
        <BowlIcon />
        <h2>{title}</h2>
        <p>{description}</p>
        {actionLabel && actionTo && (
          <button onClick={() => navigate(actionTo)}>{actionLabel}</button>
        )}
      </div>
    </div>
  );
}
