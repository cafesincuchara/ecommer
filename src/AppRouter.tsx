import { BrowserRouter, Routes, Route } from "react-router-dom";
import TestConnection from "./pages/TestConnection";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/uthCallback";

<Route path="/auth/callback" element={<AuthCallback />} />

// Rutas admin
import AdminLayout from "./pages/admin/AdminLayout";
import AdminPanel from "./pages/admin/index";
import NewProduct from "./pages/admin/NewProduct";
import EditProduct from "./pages/admin/EditProduct";
import Checkout from "./pages/Checkout";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/test" element={<TestConnection />} />
        <Route path="/auth" element={<Auth />} />

        {/* Rutas protegidas de admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminPanel />} />                       {/* /admin */}
          <Route path="products/new" element={<NewProduct />} />         {/* /admin/products/new */}
          <Route path="products/:id/edit" element={<EditProduct />} />   {/* /admin/products/:id/edit */}
        </Route>

        <Route path="/checkout" element={<Checkout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
