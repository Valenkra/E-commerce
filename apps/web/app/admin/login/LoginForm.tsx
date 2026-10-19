'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Error de acceso');
      router.replace('/admin/productos');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Error desconocido');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={login} className={styles.form}>
      <label className={styles.label} htmlFor="admin-password">Contraseña</label>
      <div className={styles.inputWrap}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.lockIcon}><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
        <input id="admin-password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required placeholder="Ingresá tu contraseña" className={styles.input} disabled={busy} />
        <button type="button" className={styles.toggle} onClick={() => setVisible(current => !current)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>
          {visible ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c5 0 9 4 10 7a13.2 13.2 0 0 1-3.1 4.2M6.3 6.3C4.3 7.6 2.9 9.7 2 12c1 3 5 7 10 7 1.6 0 3.1-.4 4.4-1.1"/><path d="M10 10a3 3 0 0 0 4 4"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>}
        </button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.submit} type="submit" disabled={busy || !password.trim()}>{busy ? 'Ingresando…' : 'Ingresar al panel'} <span aria-hidden="true">→</span></button>
    </form>
  );
}
