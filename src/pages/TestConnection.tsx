import { useEffect } from "react";
import { supabase } from "../integrations/supabase/client";

export default function TestConnection() {
  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase.from("products").select("*");

      if (error) {
        console.error("❌ Conexión fallida:", error.message);
      } else {
        console.log("✅ Conexión exitosa, datos:", data);
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Prueba de conexión a Supabase</h1>
      <p>Abre la consola del navegador para ver los resultados.</p>
    </div>
  );
}
