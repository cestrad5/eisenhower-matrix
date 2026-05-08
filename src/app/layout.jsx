import '../styles/global.css';

export const metadata = {
  title: 'Eisenhower Matrix | Master Your Time',
  description: 'Manage your tasks with the Stephen Covey time management matrix.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
