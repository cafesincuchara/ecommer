// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUser, setSession } = useAuth() as any;

  useEffect(() => {
    const handleAuthChange = async () => {
      // Escucha cambios de sesión
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session) {
            setSession(session);
            setUser(session.user);
            navigate("/"); // redirige al home
          } else {
            navigate("/auth"); // si no hay sesión, vuelve a login
          }
        }
      );

      // Limpieza de suscripción
      return () => {
        subscription.unsubscribe();
      };
    };

    handleAuthChange();
  }, [navigate, setUser, setSession]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Validando tu cuenta...</p>
    </div>
  );
};

export default AuthCallback;
