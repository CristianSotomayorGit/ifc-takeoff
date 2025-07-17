// src/hooks/useTakeoff.ts
import { useState, useCallback, useEffect } from "react";
import {
  IFCELEMENTQUANTITY,
  IFCRELASSOCIATESMATERIAL,
  IFCUNITASSIGNMENT,
} from "web-ifc";
import { useIfcParser } from "./useIfcParser";

export interface TakeoffRecord {
  material: string;
  quantity: number;
  unit: string;
  type: string;
}

export function useTakeoff() {
  const { api, loading: parserLoading, error: parserError } = useIfcParser();
  const [data, setData] = useState<TakeoffRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File>();

  const startTakeoff = useCallback((f: File) => {
    setFile(f);
  }, []);

  const detectGlobalUnits = useCallback(
    async (modelID: number) => {
      let lengthUnit = "m";
      const ids = api!.GetLineIDsWithType(modelID, IFCUNITASSIGNMENT, false);
      if (ids.size()) {
        const ua = await api!.properties.getItemProperties(
          modelID,
          ids.get(0),
          true
        );
        const ctx = ua.UnitsInContext?.value || ua.UnitsInContext || [];
        for (const item of ctx) {
          try {
            const uid = (item as any).value || item;
            const u = await api!.properties.getItemProperties(
              modelID,
              uid,
              true
            );
            if (u.UnitType?.value === "LENGTHUNIT") {
              lengthUnit = (u.Prefix?.value || "") + (u.Name?.value || u.Name);
            }
          } catch {}
        }
      }
      return { length: lengthUnit, area: lengthUnit + "²", volume: lengthUnit + "³" };
    },
    [api]
  );

  const getMaterialName = useCallback(
    async (modelID: number, rel: any) => {
      const m = rel.RelatingMaterial;
      if (m.Name) return m.Name.value || m.Name;
      if (m.ForLayerSet) {
        try {
          const ls = await api!.properties.getItemProperties(
            modelID,
            m.ForLayerSet.value || m.ForLayerSet,
            true
          );
          const layers = ls.MaterialLayers?.value || ls.MaterialLayers;
          if (layers) {
            return layers
              .map((l: any) => l.Material.Name?.value || l.Material.Name)
              .join(" + ");
          }
        } catch {}
      }
      if (m.Materials) {
        const ms = m.Materials.value || m.Materials;
        return ms.map((mm: any) => mm.Name?.value || mm.Name).join(" + ");
      }
      return "Unknown";
    },
    [api]
  );

  useEffect(() => {
    if (!file || !api) return;
    (async () => {
      setLoading(true);
      setError(null);
      setData([]);
      try {
        const buf = await file.arrayBuffer();
        const modelID = api.OpenModel(new Uint8Array(buf));
        const { length, area, volume } = await detectGlobalUnits(modelID);

        const objQ: Record<number, { volume: number; area: number; length: number }> = {};
        let volU = volume,
          areaU = area,
          lenU = length;

        const qtyIDs = api.GetLineIDsWithType(modelID, IFCELEMENTQUANTITY, false);
        for (let i = 0; i < qtyIDs.size(); i++) {
          const qid = qtyIDs.get(i);
          const qDef = await api.properties.getItemProperties(modelID, qid, true);
          const related = qDef.RelatedObjects?.value || qDef.RelatedObjects || [];
          const quants = qDef.Quantities?.value || qDef.Quantities || [];
          for (const prop of quants) {
            const num =
              prop.VolumeValue?.value ||
              prop.AreaValue?.value ||
              prop.LengthValue?.value;
            if (num == null || isNaN(num)) continue;
            let unitSym = volU;
            if (prop.Unit) {
              try {
                const uid = prop.Unit.value || prop.Unit;
                const u = await api.properties.getItemProperties(
                  modelID,
                  uid,
                  true
                );
                unitSym = (u.Prefix?.value || "") + (u.Name?.value || u.Name);
              } catch {}
            }
            let type: "Volume" | "Area" | "Length" | "Count" = "Count";
            if (prop.VolumeValue) {
              type = "Volume";
              volU = unitSym;
            } else if (prop.AreaValue) {
              type = "Area";
              areaU = unitSym;
            } else if (prop.LengthValue) {
              type = "Length";
              lenU = unitSym;
            }
            related.forEach((oid: number) => {
              objQ[oid] = objQ[oid] || { volume: 0, area: 0, length: 0 };
              if (type === "Volume") objQ[oid].volume += num;
              if (type === "Area") objQ[oid].area += num;
              if (type === "Length") objQ[oid].length += num;
            });
          }
        }

        const relIDs = api.GetLineIDsWithType(
          modelID,
          IFCRELASSOCIATESMATERIAL,
          false
        );
        if (!Object.keys(objQ).length) {
          const counts: Record<string, number> = {};
          for (let i = 0; i < relIDs.size(); i++) {
            const rel = await api.properties.getItemProperties(
              modelID,
              relIDs.get(i),
              true
            );
            const mat = await getMaterialName(modelID, rel);
            counts[mat] = (counts[mat] || 0) + 1;
          }
          setData(
            Object.entries(counts).map(([m, cnt]) => ({
              material: m,
              quantity: cnt,
              unit: "ea",
              type: "Count",
            }))
          );
        } else {
          const agg: Record<string, { volume: number; area: number; length: number }> = {};
          for (let i = 0; i < relIDs.size(); i++) {
            const rel = await api.properties.getItemProperties(
              modelID,
              relIDs.get(i),
              true
            );
            const mat = await getMaterialName(modelID, rel);
            (rel.RelatedObjects?.value || rel.RelatedObjects || []).forEach(
              (oid: number) => {
                const q = objQ[oid] || { volume: 0, area: 0, length: 0 };
                agg[mat] = agg[mat] || { volume: 0, area: 0, length: 0 };
                agg[mat].volume += q.volume;
                agg[mat].area += q.area;
                agg[mat].length += q.length;
              }
            );
          }
          const out: TakeoffRecord[] = [];
          Object.entries(agg).forEach(([m, q]) => {
            if (q.volume > 0)
              out.push({ material: m, quantity: +q.volume.toFixed(3), unit: volume, type: "Volume" });
            if (q.area > 0)
              out.push({ material: m, quantity: +q.area.toFixed(2), unit: area, type: "Area" });
            if (q.length > 0)
              out.push({ material: m, quantity: +q.length.toFixed(2), unit: length, type: "Length" });
            if (!q.volume && !q.area && !q.length)
              out.push({ material: m, quantity: 0, unit: "ea", type: "Count" });
          });
          setData(out);
        }
      } catch (e: any) {
        setError("Processing failed: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [file, api, detectGlobalUnits, getMaterialName]);

  return {
    data,
    loading: parserLoading || loading,
    error: parserError || error,
    startTakeoff,
  };
}
