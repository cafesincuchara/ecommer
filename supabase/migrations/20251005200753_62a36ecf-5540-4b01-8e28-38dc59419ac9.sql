-- Crear enum para roles de usuario
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'manager', 'customer');

-- Crear enum para estados de pedido
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

-- Tabla de productos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de roles de usuario
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabla de pedidos
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT NOT NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  status order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Función de seguridad para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Función para verificar si es admin u owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'owner')
  )
$$;

-- Políticas RLS para products
CREATE POLICY "Products son visibles para todos"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Solo admin/owner pueden insertar productos"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Solo admin/owner pueden actualizar productos"
  ON public.products FOR UPDATE
  USING (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Solo admin/owner pueden eliminar productos"
  ON public.products FOR DELETE
  USING (public.is_admin_or_owner(auth.uid()));

-- Políticas RLS para profiles
CREATE POLICY "Los perfiles son visibles para el propietario"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Los usuarios pueden crear su propio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas RLS para user_roles
CREATE POLICY "Los roles son visibles para admin/owner"
  ON public.user_roles FOR SELECT
  USING (public.is_admin_or_owner(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Solo owner puede asignar roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Solo owner puede actualizar roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Solo owner puede eliminar roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'owner'));

-- Políticas RLS para orders
CREATE POLICY "Admin/owner pueden ver todos los pedidos"
  ON public.orders FOR SELECT
  USING (public.is_admin_or_owner(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Usuarios autenticados pueden crear pedidos"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin/owner pueden actualizar pedidos"
  ON public.orders FOR UPDATE
  USING (public.is_admin_or_owner(auth.uid()));

-- Trigger para actualizar updated_at en products
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Asignar rol de customer por defecto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Función para crear pedido con transacción atómica
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_shipping_address TEXT,
  p_items JSONB,
  p_total_amount DECIMAL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_current_stock INTEGER;
BEGIN
  -- Iniciar transacción implícita
  
  -- Verificar y actualizar stock para cada producto
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    -- Obtener stock actual con bloqueo
    SELECT stock INTO v_current_stock
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;
    
    -- Verificar si hay suficiente stock
    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Producto % no encontrado', v_product_id;
    END IF;
    
    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para producto %. Disponible: %, Solicitado: %', 
        v_product_id, v_current_stock, v_quantity;
    END IF;
    
    -- Actualizar stock
    UPDATE public.products
    SET stock = stock - v_quantity
    WHERE id = v_product_id;
  END LOOP;
  
  -- Crear el pedido
  INSERT INTO public.orders (
    user_id,
    customer_email,
    customer_name,
    customer_phone,
    shipping_address,
    items,
    total_amount,
    status,
    notes
  )
  VALUES (
    auth.uid(),
    p_customer_email,
    p_customer_name,
    p_customer_phone,
    p_shipping_address,
    p_items,
    p_total_amount,
    'confirmed',
    p_notes
  )
  RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$;