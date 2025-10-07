import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { CartSheet } from '@/components/CartSheet';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import heroImage from '@/assets/hero-fashion.jpg';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const { items, addItem, updateQuantity, removeItem, total } = useCart();

  // 🔍 LOG: Detectar re-renders
  useEffect(() => {
    console.log('🔄 Index component re-rendered');
    console.log('👤 User state:', user ? 'logged in' : 'not logged in');
    console.log('📦 Products count:', products.length);
  });

  useEffect(() => {
    console.log('🚀 Cargando productos...');
    
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      
      try {
        console.log('📡 Haciendo request a Supabase...');
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        console.log('📦 Respuesta de Supabase:', { data, error, count: data?.length });

        if (error) {
          console.error('❌ Error al cargar productos:', error);
          toast.error('Error al cargar productos');
          setProducts([]);
          return;
        }

        if (!data || data.length === 0) {
          console.warn('⚠️ No hay productos en la base de datos');
          setProducts([]);
        } else {
          console.log('✅ Productos cargados:', data.length);
          console.log('✅ Llamando a setProducts con', data.length, 'productos');
          setProducts(data);
          
          // 🔍 Verificar que realmente se guardaron
          setTimeout(() => {
            console.log('🔍 Verificación: products.length después de setState:', products.length);
          }, 100);
        }
      } catch (err) {
        console.error('💥 Error inesperado al cargar productos:', err);
        toast.error('Ocurrió un error al cargar productos');
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []); // Solo se ejecuta una vez al montar

  // 🔍 LOG: Monitorear cambios en products
  useEffect(() => {
    console.log('📊 Products state cambió. Nuevo length:', products.length);
    if (products.length > 0) {
      console.log('✅ Primeros 3 productos:', products.slice(0, 3).map(p => p.name));
    }
  }, [products]);

  const handleAddToCart = (product: any) => {
    if (!user) {
      toast.error('Debes iniciar sesión para agregar productos al carrito');
      navigate('/auth');
      return;
    }

    if (product.stock === 0) {
      toast.error('Producto agotado');
      return;
    }

    const existingItem = items.find(item => item.id === product.id);
    if (existingItem && existingItem.quantity >= product.stock) {
      toast.error('No hay más stock disponible');
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
      stock: product.stock,
    });

    toast.success(`${product.name} agregado al carrito`);
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error('Debes iniciar sesión para continuar');
      navigate('/auth');
      return;
    }
    
    if (items.length === 0) {
      toast.error('Tu carrito está vacío');
      return;
    }

    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        cartItemsCount={items.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
      />

      {/* Hero Section */}
      <section className="relative h-[60vh] overflow-hidden">
        <img
          src={heroImage}
          alt="Fashion Hero"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
          <div className="container">
            <div className="max-w-xl">
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                Nueva Colección
              </h1>
              <p className="text-xl text-white/90 mb-8">
                Descubre las últimas tendencias en moda
              </p>
              <Button size="lg" variant="hero" asChild>
                <a href="#productos">Explorar Ahora</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="productos" className="py-16 px-4">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Nuestros Productos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Encuentra piezas únicas que definen tu estilo
            </p>
          </div>

          {isLoadingProducts ? (
            <div className="text-center py-12">
              <div className="animate-pulse">
                <p className="text-muted-foreground">Cargando productos...</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No hay productos disponibles
              </p>
              <p className="text-sm text-muted-foreground">
                Verifica que existan productos en la tabla 'products' de Supabase
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={items}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        total={total}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default Index;