import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AdminLayout() {
  const { user, isLoading, checkAdminStatus } = useAuth();
  const [verified, setVerified] = useState(false);
  const [toastShown, setToastShown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || verified) return; // ya verificado, no hacer nada

    const verifyAdmin = async () => {
      try {
        const isAdmin = await checkAdminStatus(user.id);

        if (!isAdmin) {
          if (!toastShown) {
            toast.error('No tienes permisos para acceder a esta página');
            setToastShown(true);
          }
          // Navegar en el próximo tick para evitar conflictos con render
          setTimeout(() => navigate('/'), 0);
        } else {
          setVerified(true);
        }
      } catch (error) {
        console.error('Error verificando admin:', error);
        setTimeout(() => navigate('/'), 0);
      }
    };

    verifyAdmin();
  }, [user, navigate, checkAdminStatus, toastShown, verified]);

  if (isLoading || !verified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Cargando panel...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
