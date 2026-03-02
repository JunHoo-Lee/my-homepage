import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PrivateShell from './components/PrivateShell';

export default async function PrivateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const authCookie = (await cookies()).get('auth_session');

    if (!authCookie) {
        redirect('/login');
    }

    return (
        <PrivateShell>
            {children}
        </PrivateShell>
    );
}
