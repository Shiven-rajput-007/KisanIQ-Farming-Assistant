import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { useLanguage } from '@/hooks/useLanguage';
import { AuthProvider } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';

function App() {
  useLanguage(); // Sync HTML lang attribute
  return (
    <AuthProvider>
      <LocationProvider>
        <RouterProvider router={router} />
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
