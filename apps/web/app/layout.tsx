import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'ValenShop | Catálogo de ropa',description:'Catálogo de ropa minorista y mayorista'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
