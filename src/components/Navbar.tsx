import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  cartItemsCount: number;
  onCartClick: () => void;
}

export const Navbar = ({ cartItemsCount, onCartClick }: NavbarProps) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    console.log('🔴 CLICK EN CERRAR SESIÓN'); // <-- Agrega esto
    try {
      console.log('🔴 Llamando a signOut...');
      await signOut();
      console.log('✅ signOut completado');
      navigate('/');
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          TIENDA
        </Link>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">Panel Admin</Link>
            </Button>
          )}

          {/* Carrito */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCartClick}
            className="relative"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartItemsCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {cartItemsCount}
              </Badge>
            )}
          </Button>

          {/* Login / Logout */}
          {user ? (
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          ) : (
            <Button variant="ghost" asChild>
              <Link to="/auth" className="gap-2">
                <User className="h-4 w-4" />
                Ingresar
              </Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
};