import { useCallback, useEffect, useState } from "react";
export function useOffline() {
  const [state, setState] = useState({
    ready: false,
    checked: 0,
    total: 0,
    message: "Menyemak persediaan luar talian…",
  });
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [waiting, setWaiting] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const verify = useCallback(
    async (reg?: ServiceWorkerRegistration, repair = false) => {
      const target = reg?.active || navigator.serviceWorker?.controller;
      if (!target) return;
      const channel = new MessageChannel();
      let replied = false;
      const timer = setTimeout(() => {
        if (!replied)
          setState((s) => ({
            ...s,
            ready: false,
            message: "Semakan belum selesai. Cuba lagi.",
          }));
        channel.port1.close();
      }, 12000);
      channel.port1.onmessage = (e) => {
        replied = true;
        clearTimeout(timer);
        setState({
          ready: e.data.ready,
          checked: e.data.cached,
          total: e.data.total,
          message: e.data.ready
            ? "Sedia luar talian"
            : "Muat turun belum lengkap. Sambung internet dan cuba lagi.",
        });
        channel.port1.close();
      };
      target.postMessage({ type: repair ? "REPAIR" : "VERIFY" }, [
        channel.port2,
      ]);
    },
    [],
  );
  const prepare = useCallback(async () => {
    if (!window.isSecureContext) {
      setState((s) => ({
        ...s,
        ready: false,
        message:
          "Buka aplikasi melalui HTTPS untuk menyediakan mod luar talian.",
      }));
      return;
    }
    if (!("serviceWorker" in navigator)) {
      setState((s) => ({
        ...s,
        message: "Pelayar ini tidak menyokong mod luar talian.",
      }));
      return;
    }
    if (import.meta.env.DEV) {
      setState((s) => ({
        ...s,
        message:
          "Mod pembangunan · uji luar talian melalui production preview.",
      }));
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      setRegistration(reg);
      setWaiting(!!reg.waiting);
      const watch = () => {
        const worker = reg.installing;
        if (!worker) return;
        setState((s) => ({
          ...s,
          message: "Memuat turun aplikasi dan audio…",
        }));
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            if (reg.active) {
              setWaiting(true);
              void verify(reg);
            } else
              setState((s) => ({ ...s, message: "Menyediakan aplikasi…" }));
          }
          if (worker.state === "activated") void verify(reg, navigator.onLine);
          if (worker.state === "redundant")
            setState((s) => ({
              ...s,
              ready: false,
              message: "Muat turun terganggu. Sambung internet dan cuba lagi.",
            }));
        });
      };
      reg.addEventListener("updatefound", watch);
      watch();
      if (reg.active) await verify(reg, navigator.onLine);
      else if (!reg.installing) {
        setState((s) => ({ ...s, message: "Memuat turun aplikasi…" }));
        // A failed first installation can leave a registration with no worker.
        // Explicitly retry its update instead of waiting for automatic checks.
        await reg.update();
      }
      // The first install is atomic: only the activated worker can report complete assets.
      if (reg.active && navigator.onLine) void reg.update().catch(() => {});
    } catch {
      setState((s) => ({
        ...s,
        ready: false,
        message:
          "Persediaan luar talian gagal. Sambung internet dan cuba lagi.",
      }));
    }
  }, [verify]);
  useEffect(() => {
    void prepare();
    const connection = () => setOnline(navigator.onLine);
    const controlled = () => void verify(undefined, navigator.onLine);
    const progress = (e: MessageEvent) => {
      if (e.data?.type === "DOWNLOAD_PROGRESS")
        setState((s) =>
          s.ready
            ? s
            : {
                ...s,
                checked: e.data.downloaded,
                total: e.data.total,
                message: `Memuat turun ${e.data.downloaded}/${e.data.total} fail…`,
              },
        );
    };
    navigator.serviceWorker?.addEventListener("message", progress);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    navigator.serviceWorker?.addEventListener("controllerchange", controlled);
    return () => {
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        controlled,
      );
      navigator.serviceWorker?.removeEventListener("message", progress);
    };
  }, [prepare, verify]);
  return {
    ...state,
    waiting,
    online,
    retry: prepare,
    activate: () => {
      registration?.waiting?.postMessage({ type: "ACTIVATE" });
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => location.reload(),
        { once: true },
      );
    },
  };
}
