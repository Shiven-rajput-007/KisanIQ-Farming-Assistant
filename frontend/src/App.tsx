import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { useLanguage } from '@/hooks/useLanguage';
import { AuthProvider } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { ThemeProvider } from '@/context/ThemeContext';

function App() {
  useLanguage(); // Sync HTML lang attribute
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocationProvider>
          <RouterProvider router={router} />
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
