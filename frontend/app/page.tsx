"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/Spinner";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState("kristina@zaytseva-interior.ru");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Не удалось войти");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-brand-panel">
          <div className="login-logo">
            <span className="login-logo__mark">ZI</span>
            <div>
              <strong>Zaytseva Interior</strong>
              <small>СТУДИЯ ДИЗАЙНА ИНТЕРЬЕРОВ</small>
            </div>
          </div>

          <div className="login-brand-panel__content">
            <h1>
              Проекты интерьеров, этапы, чертежи и согласования — в одном
              рабочем пространстве.
            </h1>

            <div className="login-features">
              <span>
                <i className="dot dot--sand" />
                Все объекты и этапы
              </span>
              <span>
                <i className="dot dot--blue" />
                Планы, рендеры и спецификации
              </span>
              <span>
                <i className="dot dot--green" />
                Комментарии Ольги и Кристины
              </span>
            </div>
          </div>

          <small className="login-server-note">
            Ваш сервер · собственные данные · доступ 24/7
          </small>
        </div>

        <div className="login-form-panel">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</div>
            <h2>Войти</h2>
            <p>Используйте рабочий аккаунт</p>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Пароль</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? <div className="form-error">{error}</div> : null}

            <button
              className="button button--primary button--wide"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <>
                  <Spinner small />
                  Входим...
                </>
              ) : (
                "Войти в Zaytseva Interior"
              )}
            </button>

            <div className="login-form__footnote">
              Аккаунты создаёт администратор. Самостоятельная регистрация не
              требуется.
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
