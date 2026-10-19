import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <section className={styles.card} aria-labelledby="not-found-title">
        <div className={styles.illustration} aria-hidden="true">
          <svg viewBox="0 0 420 330" role="img" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bagGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#bdeaff" />
                <stop offset="1" stopColor="#73c8f3" />
              </linearGradient>
              <linearGradient id="tagGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff" />
                <stop offset="1" stopColor="#e7f7ff" />
              </linearGradient>
            </defs>
            <ellipse cx="210" cy="291" rx="133" ry="16" fill="#7eb8d9" opacity=".22" />
            <circle cx="65" cy="92" r="5" fill="#66b9e7" />
            <circle cx="348" cy="92" r="7" fill="#b2e6ff" />
            <path d="M84 185l8-14 8 14 14 8-14 8-8 14-8-14-14-8z" fill="#95d9fa" />
            <path d="M329 200l6-11 6 11 11 6-11 6-6 11-6-11-11-6z" fill="#54a8d7" />
            <g className={styles.bag}>
              <path d="M130 106h160l20 164a14 14 0 0 1-14 16H124a14 14 0 0 1-14-16z" fill="url(#bagGradient)" stroke="#4d9dc9" strokeWidth="4" strokeLinejoin="round" />
              <path d="M165 121V90a45 45 0 0 1 90 0v31" fill="none" stroke="#367da8" strokeWidth="12" strokeLinecap="round" />
              <path d="M165 121V90a45 45 0 0 1 90 0v31" fill="none" stroke="#e8f8ff" strokeWidth="5" strokeLinecap="round" />
              <path d="M130 135h160" stroke="#8bc9eb" strokeWidth="3" opacity=".55" />
              <text x="210" y="223" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="79" fontWeight="800" letterSpacing="-6" fill="#fff">404</text>
              <path d="M174 242q36 19 72 0" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".8" />
            </g>
            <g className={styles.tag} transform="rotate(13 305 134)">
              <path d="M278 93h67a9 9 0 0 1 9 9v61a9 9 0 0 1-9 9h-67l-22-39z" fill="url(#tagGradient)" stroke="#83bfdf" strokeWidth="3" />
              <circle cx="278" cy="133" r="5" fill="#70b6dd" />
              <path d="M278 133l-29-26" fill="none" stroke="#367da8" strokeWidth="3" strokeLinecap="round" />
              <path d="M304 121h27M304 135h21M304 149h15" stroke="#86c5e6" strokeWidth="4" strokeLinecap="round" />
            </g>
          </svg>
        </div>
        
        <h1 id="not-found-title">¡Ups! Página no encontrada</h1>
        <p>Parece que esta página se perdió.</p>
        <Link href="/" className={styles.backButton}>Volver a la tienda <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
