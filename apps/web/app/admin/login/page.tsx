import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/admin-auth';
import LoginForm from './LoginForm';
export default async function LoginPage(){if(await isAdmin())redirect('/admin/productos');return <main style={{maxWidth:440,margin:'10vh auto',padding:24}}><h1>Acceso del vendedor</h1><p>Ingresá la contraseña de administración.</p><LoginForm/></main>}
