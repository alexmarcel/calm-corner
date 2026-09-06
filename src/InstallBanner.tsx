import { useLayoutEffect, useRef, useState } from "react";
import { Share, Smartphone } from "lucide-react";
import type { useInstallation } from "./installation";

export function InstallationGuide({
  platform = "all",
  installed = false,
}: {
  platform?: string;
  installed?: boolean;
}) {
  if (installed)
    return (
      <p>
        Tinggalkan pelayar ini dan ketik ikon Calm Corner pada skrin utama
        peranti anda. Jika ikon belum ada, kembali ke sini dan pilih Cara
        memasang.
      </p>
    );
  return (
    <div className="installation-guide">
      {platform !== "ios" && (
        <section>
          <h3>
            <Smartphone size={18} /> Android / Chrome / Edge
          </h3>
          <p>
            Buka menu pelayar dan pilih “Install app” atau “Add to Home screen”,
            kemudian ikut arahan pelayar. Jika pilihan ini tiada, buka laman ini
            dalam Chrome.
          </p>
        </section>
      )}
      {platform !== "android" && (
        <section>
          <h3>
            <Share size={18} /> iPhone / iPad
          </h3>
          <ol>
            <li>Buka laman ini dalam Safari.</li>
            <li>Tekan Kongsi (Share).</li>
            <li>Pilih Tambah ke Skrin Utama (Add to Home Screen).</li>
            <li>
              Aktifkan Open as Web App jika pilihan ini dipaparkan, kemudian
              tekan Tambah (Add).
            </li>
          </ol>
          <p>
            Catatan dalam Safari mungkin tidak dipindahkan ke aplikasi skrin
            utama. Jika anda sudah mempunyai catatan, gunakan Privasi & storan →
            Eksport sandaran sebelum memasang. Kemudian buka aplikasi dari skrin
            utama dan gunakan Pulihkan sandaran.
          </p>
        </section>
      )}
      <p>
        Selepas memasang, buka aplikasi dari skrin utama dengan internet dan
        biarkan persediaan awal selesai. Tunggu “Sedia luar talian” sebelum
        menggunakan aplikasi tanpa internet.
      </p>
    </div>
  );
}

export default function InstallBanner({
  installation,
  blocked,
  onGuide,
}: {
  installation: ReturnType<typeof useInstallation>;
  blocked: boolean;
  onGuide: (installed: boolean) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const banner = ref.current!;
    const root = document.documentElement;
    const update = () => {
      const space = banner.getBoundingClientRect().height + 16;
      setHeight(space);
      root.style.setProperty("--install-banner-space", `${space}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--install-banner-space");
    };
  }, []);
  const native = installation.platform === "android" && installation.available;
  return (
    <>
      <div aria-hidden="true" style={{ height }} />
      <aside
        ref={ref}
        className="install-banner"
        aria-label="Pasang Calm Corner"
        inert={blocked}
      >
        <div className="install-banner-heading">
          <img src="/icons/icon-192.png" alt="" width="44" height="44" />
          <div>
            <strong>Pasang Calm Corner</strong>
            <p>Akses mudah dari skrin utama.</p>
          </div>
        </div>
        <div className="install-banner-actions">
          <button
            className="primary"
            disabled={installation.busy}
            onClick={(e) => {
              e.currentTarget.focus();
              if (installation.installed) onGuide(true);
              else if (native) void installation.install();
              else onGuide(false);
            }}
          >
            {installation.busy
              ? "Sedang memasang…"
              : installation.installed
                ? "Buka dari skrin utama"
                : native
                  ? "Pasang aplikasi"
                  : "Cara memasang"}
          </button>
          <button
            className="text-link"
            onClick={(e) => {
              e.currentTarget.focus();
              onGuide(true);
            }}
          >
            Sudah pasang?
          </button>
        </div>
        {installation.error && <p role="status">{installation.error}</p>}
      </aside>
    </>
  );
}
