// src/hooks/useEngine.tsx
import { useRef, useEffect, useCallback } from "react";
import * as OBC from "@thatopen/components";

export function useEngine(
  containerRef: React.RefObject<HTMLDivElement>,
  onProgress?: (pct: number) => void
) {
  const loadIfcRef = useRef<(path: string) => Promise<void>>();

  const loadIfc = useCallback(
    async (path: string) => {
      if (!loadIfcRef.current) {
        console.warn("IFC loader not initialized yet");
        return;
      }
      return loadIfcRef.current(path);
    },
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const components = new OBC.Components();
    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBC.SimpleRenderer
    >();

    world.scene = new OBC.SimpleScene(components);
    world.scene.setup();
    world.scene.three.background = null;
    const renderer = new OBC.SimpleRenderer(components, container);
    world.renderer = renderer;
    world.camera = new OBC.SimpleCamera(components);
    world.camera.controls.setLookAt(58, 22, -25, 13, 0, 4.2);
    components.init();
    components.get(OBC.Grids).create(world);

    (async () => {
      const ifcLoader = components.get(OBC.IfcLoader);
      await ifcLoader.setup({
        autoSetWasm: false,
        wasm: { path: "https://unpkg.com/web-ifc@0.0.69/", absolute: true },
      });

      const workerResp = await fetch(
        "https://thatopen.github.io/engine_fragment/resources/worker.mjs"
      );
      const workerBlob = await workerResp.blob();
      const workerUrl = URL.createObjectURL(
        new File([workerBlob], "worker.mjs", { type: "text/javascript" })
      );
      components.get(OBC.FragmentsManager).init(workerUrl);

      world.camera.controls.addEventListener("rest", () =>
        components.get(OBC.FragmentsManager).core.update(true)
      );
      components
        .get(OBC.FragmentsManager)
        .list.onItemSet.add(({ value: model }) => {
          model.useCamera(world.camera.three);
          world.scene.three.add(model.object);
          components.get(OBC.FragmentsManager).core.update(true);
        });

      loadIfcRef.current = async (path: string) => {
        const resp = await fetch(path);
        const data = await resp.arrayBuffer();
        const buffer = new Uint8Array(data);
        await ifcLoader.load(buffer, false, "example", {
          processData: {
            progressCallback: (p: number) => {
              onProgress?.(p * 100);
            },
          },
        });
      };

      await world.camera.controls.setLookAt(68, 23, -8.5, 21.5, -5.5, 23);
      await components.get(OBC.FragmentsManager).core.update(true);
    })();

    return () => {
      renderer.dispose?.();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [containerRef, onProgress]);

  return loadIfc;
}
