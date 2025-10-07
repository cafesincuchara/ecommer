import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any; user?: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  checkAdminStatus: (userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Solo true en la carga INICIAL
  const [isInitialized, setIsInitialized] = useState(false);
  
  const isCheckingAdmin = useRef(false);

  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    if (!userId || isCheckingAdmin.current) return false;
    
    isCheckingAdmin.current = true;
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['admin', 'owner'])
        .maybeSingle();
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return false;
      }
      
      const isUserAdmin = !!data;
      setIsAdmin(isUserAdmin);
      return isUserAdmin;
    } finally {
      isCheckingAdmin.current = false;
    }
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error, user: data?.user ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    console.log('🔴 Ejecutando signOut en AuthContext...');
    
    // Limpiar estado PRIMERO (no esperar a Supabase)
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    console.log('✅ Estado local limpiado');
    
    try {
      // Intentar cerrar sesión en Supabase (pero no bloquear el UI)
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('⚠️ Error en signOut de Supabase:', error);
      } else {
        console.log('✅ Sesión cerrada en Supabase');
      }
    } catch (error) {
      console.error('❌ Excepción en signOut:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await checkAdminStatus(currentSession.user.id);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        if (mounted) {
          setIsLoading(false); // ✅ Solo desactivar loading después de la PRIMERA carga
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      console.log('Auth state changed:', event);

      // ✅ NO volver a activar isLoading después de la inicialización
      // Los cambios de estado posteriores no deben mostrar la pantalla de carga

      // Manejar explícitamente SIGNED_OUT
      if (event === 'SIGNED_OUT') {
        console.log('🚪 Usuario cerró sesión (evento capturado)');
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        return;
      }

      // Para TOKEN_REFRESHED y SIGNED_IN, actualizar silenciosamente
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user && event === 'SIGNED_IN') {
        // Solo verificar admin status en SIGNED_IN, no en TOKEN_REFRESHED
        await checkAdminStatus(newSession.user.id);
      } else if (!newSession?.user) {
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  // ✅ Solo mostrar loading screen en la carga inicial
  // Después de eso, permitir que la app funcione normalmente
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Iniciando sesión...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      setUser, 
      setSession, 
      isAdmin, 
      isLoading, 
      signUp, 
      signIn, 
      signOut, 
      checkAdminStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};