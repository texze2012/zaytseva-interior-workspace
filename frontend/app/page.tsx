"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (!loading && user) router.replace("/dashboard"); }, [loading, router, user]);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { await login(email.trim(), password); router.replace("/dashboard"); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось войти"); } finally { setBusy(false); } }
  if (loading || user) return <div className="fullscreen-loader"><Spinner/><span>Проверяем сессию</span></div>;
  return <main className="login-page"><section className="login-shell"><aside className="login-brand-panel"><div className="login-logo"><span className="login-logo__mark">ZI</span><span><strong>Zaytseva</strong><small>INTERIOR WORKSPACE</small></span></div><div className="login-brand-panel__content"><span className="eyebrow eyebrow--light">ОПЕРАЦИОННОЕ РАБОЧЕЕ ПРОСТРАНСТВО</span><h1>Проекты, комплектация, поставки и договорённости в одном контуре.</h1><div className="login-features"><span><i/>Состояние всех объектов без поиска по чатам</span><span><i/>Контроль комплектации от подбора до получения</span><span><i/>Ожидания, оплаты и календарь контрольных дат</span></div></div><p className="login-server-note">Доступ только для сотрудников студии</p></aside><div className="login-form-panel"><form className="login-form" onSubmit={submit}><span className="eyebrow">ZAYTSEVA INTERIOR</span><h2>Вход</h2><p>Используйте рабочую учётную запись.</p>{error ? <div className="form-error">{error}</div> : null}<label className="field"><span>Email</span><input autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.ru"/></label><label className="field"><span>Пароль</span><input autoComplete="current-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}/></label><button className="button button--primary button--full" disabled={busy}>{busy ? "Входим" : "Войти"}</button></form></div></section></main>;
}
