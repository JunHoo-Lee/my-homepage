import PrivateShell from './components/PrivateShell';

export default function PrivateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PrivateShell>
            {children}
        </PrivateShell>
    );
}
