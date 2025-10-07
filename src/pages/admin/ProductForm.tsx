import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, UploadCloud, Loader2 } from 'lucide-react';

interface ProductFormProps {
  id?: string;
}

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number | string;
  stock: number | string;
  image_url: string;
  category: string;
}

export default function ProductForm({ id: propsId }: ProductFormProps) {
  const { id: urlId } = useParams<{ id: string }>();
  const productId = propsId || urlId;
  const isEditing = !!productId;
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [product, setProduct] = useState<Product>({
    name: '',
    description: '',
    price: '',
    stock: '',
    image_url: '',
    category: ''
  });

  // Load product data if editing
  useEffect(() => {
    if (!productId) return;

    const fetchProduct = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        toast.error('Error al cargar el producto');
        navigate('/admin');
        return;
      }

      setProduct({
        ...data,
        price: data.price.toString(),
        stock: data.stock.toString(),
        image_url: data.image_url || '',
        category: data.category || ''
      });
      setLoading(false);
    };

    fetchProduct();
  }, [productId, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setProduct(prev => ({
        ...prev,
        image_url: publicUrl
      }));
      
      toast.success('Imagen subida correctamente');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product.name || !product.price || product.stock === '') {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    setLoading(true);

    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    const stock = typeof product.stock === 'string' ? parseInt(product.stock, 10) : product.stock;

    if (isNaN(price) || isNaN(stock)) {
      toast.error('Precio y stock deben ser números válidos');
      setLoading(false);
      return;
    }

    const productData = {
      name: product.name,
      description: product.description,
      price: price,
      stock: stock,
      image_url: product.image_url,
      category: product.category
    };

    try {
      if (isEditing && productId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId);

        if (error) throw error;
        toast.success('Producto actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        toast.success('Producto creado correctamente');
      }
      
      navigate('/admin');
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(`Error al ${isEditing ? 'actualizar' : 'crear'} el producto`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Cargando producto...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/admin')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al panel
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del producto *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={product.name}
                    onChange={handleChange}
                    placeholder="Ej: Camiseta de algodón"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={product.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe el producto..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Precio *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5">$</span>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        value={product.price}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="pl-8"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock *</Label>
                    <Input
                      id="stock"
                      name="stock"
                      type="number"
                      value={product.stock}
                      onChange={handleChange}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    name="category"
                    value={product.category}
                    onChange={handleChange}
                    placeholder="Ej: Ropa, Accesorios, etc."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Imagen del producto</Label>
                  {product.image_url ? (
                    <div className="space-y-2">
                      <img
                        src={product.image_url}
                        alt={product.name || 'Vista previa'}
                        className="h-48 w-full rounded-md border object-cover"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setProduct(prev => ({ ...prev, image_url: '' }))}
                      >
                        Cambiar imagen
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                          <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG o WEBP (MAX. 5MB)
                          </p>
                        </div>
                        <input 
                          id="image-upload" 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : isEditing ? (
                  'Actualizar Producto'
                ) : (
                  'Crear Producto'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
