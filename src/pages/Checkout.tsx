import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';

type FormField = 'name' | 'email' | 'phone' | 'address' | 'notes';

interface CheckoutFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

interface OrderItem {
  product_id: number;
  name: string;
  quantity: number;
  price: number;
}

const Checkout = () => {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const initialFormData: CheckoutFormData = {
    name: user?.user_metadata?.full_name?.trim() || '',
    email: user?.email?.trim() || '',
    phone: user?.user_metadata?.phone?.trim() || '',
    address: user?.user_metadata?.shipping_address?.trim() || '',
    notes: ''
  };

  const [formData, setFormData] = useState<CheckoutFormData>(initialFormData);

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = useCallback(() => {
    const errors: string[] = [];

    if (!formData.name.trim()) errors.push('El nombre es obligatorio');
    if (!formData.email.trim()) {
      errors.push('El correo electrónico es obligatorio');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('El correo electrónico no es válido');
    }
    if (!formData.address.trim()) errors.push('La dirección es obligatoria');

    if (!items.length) {
      errors.push('El carrito está vacío');
    } else if (items.some(item => !item.quantity || item.quantity < 1)) {
      errors.push('Cantidad inválida en uno o más productos');
    } else if (items.some(item => !item.price || item.price <= 0)) {
      errors.push('Precio inválido en uno o más productos');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [formData, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { isValid, errors } = validateForm();
    if (!isValid) {
      errors.forEach(error => toast.error(error));
      setIsLoading(false);
      return;
    }

    const orderItems: OrderItem[] = items.map(item => ({
      product_id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price.toFixed(2)),
    }));

    try {
      // Crear orden en Supabase
      const rpcParams = {
        p_customer_email: formData.email.trim(),
        p_customer_name: formData.name.trim(),
        p_customer_phone: formData.phone.trim() || null,
        p_shipping_address: formData.address.trim(),
        p_total_amount: Number(totalAmount.toFixed(2)),
        p_notes: formData.notes.trim() || null,
        p_items: orderItems
      };

      const { data: orderId, error } = await supabase.rpc<string>('create_order_atomic_v2', rpcParams);
      if (error) throw error;

      // Preparar datos del email
      const emailData = {
        orderId,
        customerEmail: formData.email.trim(),
        customerName: formData.name.trim(),
        items: orderItems,
        totalAmount: Number(totalAmount.toFixed(2)),
        shippingAddress: formData.address.trim(),
        notes: formData.notes.trim()
      };

      // Configuración URL de función y headers
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const isLocalhost = window.location.hostname === 'localhost';
      const functionUrl = isLocalhost
        ? 'http://127.0.0.1:54321/functions/v1/send-order-email'
        : `${supabaseUrl}/functions/v1/send-order-email`;

      // CORRECCIÓN: Incluir tanto Authorization como apikey
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey || ''}`,
        'apikey': supabaseKey || ''
      };

      // Llamada a la función de Supabase
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(emailData)
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error('Error enviando email:', errData);
      } else {
        const successData = await res.json();
        console.log('Email enviado con éxito:', successData);
      }

      toast.success('¡Pedido realizado con éxito!', { 
        description: `Número de orden: ${orderId}`, 
        duration: 5000 
      });

      clearCart();
      setTimeout(() => navigate('/'), 2000);

    } catch (err: any) {
      console.error('Error procesando el pedido:', err);
      toast.error('Ocurrió un error al procesar tu pedido.', { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">Tu carrito está vacío</p>
            <Button onClick={() => navigate('/')} variant="hero">
              Ver Productos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="container max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de Envío</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                    placeholder="Juan Pérez" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                    placeholder="juan@ejemplo.com" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    placeholder="+56 9 1234 5678" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección de Envío *</Label>
                  <Textarea 
                    id="address" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    required 
                    rows={3} 
                    placeholder="Calle Principal 123, Depto 4B" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas para el vendedor (opcional)</Label>
                  <Textarea 
                    id="notes" 
                    name="notes" 
                    value={formData.notes} 
                    onChange={handleChange} 
                    rows={2} 
                    placeholder="Ej: Dejar en portería" 
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg" 
                  disabled={isLoading} 
                  variant="hero"
                >
                  {isLoading ? 'Procesando...' : `Confirmar Pedido - $${totalAmount.toFixed(2)}`}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Resumen del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;