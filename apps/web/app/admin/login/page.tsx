import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import LoginForm from './LoginForm';
import styles from './login.module.css';

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin/dashboard');

  return (
    <main className={styles.page}>
      <div className={styles.glowOne} aria-hidden="true" />
      <div className={styles.glowTwo} aria-hidden="true" />
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brandMark} aria-hidden="true">
          <svg viewBox="0 0 100 100" fill="none" className={styles.bag}>
            <path d="M27 35h46l6 46H21l6-46Z" fill="#9DD7F5" stroke="#256394" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M37 39V28a13 13 0 0 1 26 0v11" stroke="#256394" strokeWidth="4" strokeLinecap="round" />
            <path d="M38 57c6 8 18 8 24 0" stroke="#256394" strokeWidth="3" strokeLinecap="round" />
            <path d="M72 28l12 3-3 17-12-3-6-11 9-6Z" fill="#fff" stroke="#5AA4D0" strokeWidth="2" />
            <circle cx="72" cy="34" r="2" fill="#5AA4D0" />
          </svg>
        </div>
        <div className={styles.heading}>
          <span className={styles.kicker}>VALENSHOP · ADMIN</span>
          <h1 id="login-title">Bienvenida de nuevo</h1>
          <p>Ingresá para gestionar tu tienda.</p>
        </div>
        <LoginForm />
        <p className={styles.footer}>Acceso exclusivo para administración</p>
      </section>
    </main>
  );
}
