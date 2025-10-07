# 🛍️ Tienda Online con Supabase y React

Una tienda en línea moderna construida con React, Supabase, y desplegada en Vercel. Incluye autenticación, carrito de compras y panel de administración.

## 🚀 Descripción General

Este proyecto es una plataforma de comercio electrónico completa que permite a los usuarios:
- Explorar productos
- Iniciar sesión/registrarse
- Agregar productos al carrito
- Realizar pedidos
- Recibir confirmaciones por correo electrónico

### 🛠️ Tecnologías Principales
- **Frontend**: React + TypeScript + Vite
- **UI/UX**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Base de datos y Autenticación)
- **Email**: Resend
- **Despliegue**: Vercel
- **Formularios**: React Hook Form + Zod
- **Manejo de Estado**: React Query

## 📁 Estructura del Proyecto




## 🛠️ Funcionamiento

### Flujo del Usuario
1. **Exploración**: Los usuarios pueden navegar por los productos sin necesidad de iniciar sesión.
2. **Autenticación**: Para realizar compras, los usuarios deben registrarse o iniciar sesión.
3. **Carrito**: Los usuarios pueden agregar/eliminar productos y ver el total.
4. **Checkout**: Proceso de pago con validación de formulario.
5. **Confirmación**: Los usuarios reciben un correo de confirmación.

### Backend (Supabase)
- **Autenticación**: Manejo de usuarios con Supabase Auth.
- **Base de Datos**: Almacenamiento de productos, pedidos y perfiles de usuario.
- **Funciones Edge**: Para operaciones seguras del lado del servidor.

### Envío de Correos (Resend)
- Se utiliza la API de Resend para enviar correos de confirmación de pedidos.
- Las plantillas de correo están diseñadas para ser responsivas y profesionales.

## 🧠 Lógica Técnica

### Manejo de Estado
- **Autenticación**: Contexto de autenticación global.
- **Carrito**: Estado local con persistencia en localStorage.
- **Datos Remotos**: React Query para el fetching y caching de datos.

### Componentes Clave
- **ProductList**: Muestra la lista de productos con paginación.
- **Cart**: Muestra los productos en el carrito con opciones para modificar cantidades.
- **CheckoutForm**: Formulario de pago con validación.
- **AdminPanel**: Interfaz para gestionar productos y pedidos.

## 🛠️ Reutilización del Proyecto

### Personalización
1. **Diseño**: Modifica los colores en [tailwind.config.ts](cci:7://file:///c:/Users/vicen/Desktop/shop-solo-supa-main/tailwind.config.ts:0:0-0:0).
2. **Contenido**: Actualiza los productos en la base de datos de Supabase.
3. **Dominio**: Configura tu propio dominio en Vercel.

### Configuración Requerida
1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Configura las tablas necesarias (products, orders, profiles).
3. Configura la autenticación en Supabase.
4. Crea una cuenta en [Resend](https://resend.com/) para el envío de correos.

## 🚀 Despliegue

### Variables de Entorno
Crea un archivo [.env](cci:7://file:///c:/Users/vicen/Desktop/shop-solo-supa-main/.env:0:0-0:0) en la raíz del proyecto con:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
VITE_RESEND_API_KEY=tu_api_key_de_resend
VITE_SITE_URL=tu_url_de_produccion