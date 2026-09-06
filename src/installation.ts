import { useEffect, useRef, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function useInstallation() {
  const platform =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      ? "ios"
      : /Android/.test(navigator.userAgent)
        ? "android"
        : "desktop";
  const [standalone, setStandalone] = useState(
    () =>
      matchMedia("(display-mode: standalone)").matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone,
  );
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [error, setError] = useState("");
  const event = useRef<InstallEvent | null>(null);
  const prompting = useRef(false);
  useEffect(() => {
    const mode = matchMedia("(display-mode: standalone)");
    const changed = () =>
      setStandalone(
        mode.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    const ready = (e: Event) => {
      e.preventDefault();
      event.current = e as InstallEvent;
      setAvailable(true);
      setError("");
    };
    const complete = () => {
      event.current = null;
      setAvailable(false);
      setInstalled(true);
      setError("");
    };
    mode.addEventListener("change", changed);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", complete);
    return () => {
      mode.removeEventListener("change", changed);
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  const install = async () => {
    if (!event.current || prompting.current) return;
    const pending = event.current;
    event.current = null;
    prompting.current = true;
    setAvailable(false);
    setBusy(true);
    setError("");
    try {
      await pending.prompt();
      await pending.userChoice;
    } catch {
      setError(
        "Pemasangan tidak dapat dimulakan. Gunakan panduan Cara memasang.",
      );
    } finally {
      prompting.current = false;
      setBusy(false);
    }
  };
  return { platform, standalone, available, busy, installed, error, install };
}
