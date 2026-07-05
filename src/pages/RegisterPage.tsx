import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { ApiException } from "../types";

export function RegisterPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    try {
      login(name, phone);
      navigate("/");
    } catch (err) {
      setErrorMsg(err instanceof ApiException ? err.payload.message : "Не получилось войти");
    }
  }

  return (
    <div className="register-screen">
      <form className="register-ticket" onSubmit={handleSubmit}>
        <div className="register-ticket__hole" />
        <div className="register-ticket__tear" />

        <h1>Добро пожаловать в мастерскую</h1>
        <p className="register-ticket__hint">
          Без пароля и смс — просто представьтесь.
        </p>

        <label className="field">
          <span>Имя</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как к вам обращаться"
            autoFocus
          />
        </label>

        <label className="field">
          <span>Телефон</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 900 000-00-00"
          />
        </label>

        {errorMsg && <div className="banner banner--error">{errorMsg}</div>}

        <button type="submit">Войти в мастерскую</button>

        <p className="register-ticket__footnote">
          Учебная демо-версия: любое имя и любой телефон подойдут для входа.
        </p>
      </form>
    </div>
  );
}
