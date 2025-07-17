import { useState, useEffect } from "react";
import { IfcAPI } from "web-ifc";

export function useIfcParser() {
  const [api, setApi] = useState<IfcAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ifc = new IfcAPI();
    ifc.SetWasmPath("/ifc-takeoff/wasm/");
    ifc
      .Init()
      .then(() => {
        setApi(ifc);
        setLoading(false);
      })
      .catch((e: any) => {
        setError("IFC init failed: " + e.message);
        setLoading(false);
      });
  }, []);

  return { api, loading, error };
}
