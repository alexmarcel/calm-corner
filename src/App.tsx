import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  ArrowDown,
  ArrowUpRight,
  BookHeart,
  Check,
  CircleHelp,
  Download,
  Heart,
  HeartHandshake,
  History,
  Leaf,
  Menu,
  Phone,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import { Brand, Modal } from "./components";
import CheckInPanel from "./CheckIn";
import Diary, { type DiaryHandle } from "./Diary";
import Tools from "./Tools";
import Settings from "./Settings";
import {
  emptyData,
  localDate,
  moods,
  repository,
  supportFor,
  type Contact,
  type Settings as Profile,
} from "./data";
import { useOffline } from "./offline";
import { useInstallation } from "./installation";
import InstallBanner, { InstallationGuide } from "./InstallBanner";
const messages = [
  [
    "Anda tidak perlu sempurna.",
    "Hadir untuk diri sendiri hari ini pun sudah cukup.",
  ],
  [
    "Perlahan juga satu kemajuan.",
    "Satu nafas. Satu langkah. Pada rentak anda sendiri.",
  ],
  [
    "Perasaan anda ada tempat di sini.",
    "Beri diri anda ruang untuk merasa, tanpa menghakimi.",
  ],
  [
    "Berehat bukan bererti mengalah.",
    "Kadang-kadang, menjaga diri bermula dengan berhenti seketika.",
  ],
  [
    "Hari ini, pilih untuk berlembut.",
    "Bercakaplah dengan diri seperti anda bercakap dengan seorang sahabat.",
  ],
  [
    "Anda layak menerima sokongan.",
    "Anda tidak perlu melalui semuanya seorang diri.",
  ],
  [
    "Perkara kecil juga bermakna.",
    "Seteguk air, sedikit udara segar, satu senyuman untuk diri.",
  ],
];
export default function App() {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [modal, setModal] = useState<
    "sos" | "settings" | "history" | "install" | "installed" | null
  >(null);
  const [pauseSignal, setPauseSignal] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [menu, setMenu] = useState(false);
  const [checkInRequest, setCheckInRequest] = useState(0);
  const checkInPending = useRef(false);
  const navigateToCheckIn = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setMenu(false);
    checkInPending.current = true;
    setCheckInRequest((request) => request + 1);
  };
  const diary = useRef<DiaryHandle>(null);
  const offline = useOffline();
  const installation = useInstallation();
  const mobileInstall =
    installation.platform !== "desktop" && !installation.standalone;
  const refresh = useCallback(async () => {
    try {
      setData(await repository.load());
      setStorageError("");
    } catch (e) {
      setStorageError(
        "Storan peranti tidak tersedia. Data tidak dapat dimuatkan atau disimpan. Anda masih boleh menggunakan alat menenangkan dan SOS.",
      );
      throw e;
    }
  }, []);
  useEffect(() => {
    void refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    if (loading || !checkInPending.current) return;
    const destination =
      data.settings || storageError ? "checkin" : "onboarding";
    const target = document.getElementById(destination);
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
      target.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      history.replaceState(history.state, "", `#${destination}`);
      if (destination === "checkin") checkInPending.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [checkInRequest, loading, data.settings, storageError]);
  const pause = useCallback(() => setPauseSignal((v) => v + 1), []);
  const close = useCallback(() => setModal(null), []);
  const sos = useCallback(() => {
    pause();
    setModal("sos");
  }, [pause]);
  const openSettings = () => {
    pause();
    setModal("settings");
  };
  const reset = () => {
    setModal(null);
    setEpoch((x) => x + 1);
    void refresh().catch(() => {});
  };
  const today = new Date();
  const day = Math.floor(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000,
  );
  const message = messages[day % messages.length];
  const todayChecks = data.checks.filter(
    (c) => new Date(c.createdAt).toDateString() === today.toDateString(),
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Langkau ke kandungan
      </a>
      <div className="top-shell" id="home">
        <header className="site-header">
          <Brand />
          <nav aria-label="Navigasi utama" className={menu ? "open" : ""}>
            <a href="#checkin" onClick={navigateToCheckIn}>
              Ruang saya
            </a>
            <a href="#tools" onClick={() => setMenu(false)}>
              Aktiviti tenang
            </a>
            <button
              onClick={() => {
                setModal("history");
                setMenu(false);
              }}
            >
              Catatan & sejarah
            </button>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button settings-button"
              aria-label="Tetapan"
              onClick={openSettings}
            >
              <SettingsIcon size={19} />
            </button>
            <button className="sos-button" onClick={sos}>
              <HeartHandshake size={16} />
              SOS / Bantuan
            </button>
            <button
              className="icon-button mobile-menu"
              aria-label="Menu navigasi"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </header>
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span /> RUANG KECIL UNTUK DIRI ANDA
            </span>
            <h1>
              Tarik nafas.
              <br />
              Anda <em>di sini.</em>
            </h1>
            <p>
              Di tengah sibuknya dunia, ada ruang untuk berhenti.
              <br className="desktop-br" /> Kenali perasaan anda, luahkan
              cerita, dan cari tenang.
            </p>
            <a className="hero-cta" href="#checkin" onClick={navigateToCheckIn}>
              Mari check-in <ArrowDown size={16} />
            </a>
            <span className="hero-reassurance">
              <ShieldCheck size={14} />
              Peribadi. Tanpa akaun. Pada rentak anda.
            </span>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-halo" />
            <div className="art-window">
              <div className="sun" />
              <div className="hill hill-back" />
              <div className="hill hill-front" />
              <div className="art-water" />
              <div className="water-line one" />
              <div className="water-line two" />
            </div>
            <div className="art-leaf leaf-one" />
            <div className="art-leaf leaf-two" />
            <div className="art-leaf leaf-three" />
            <div className="art-pot" />
            <span className="art-spark s1">✧</span>
            <span className="art-spark s2">✧</span>
            <div className="art-caption">
              <span>☀</span> Satu hari, satu langkah kecil.
            </div>
          </div>
        </section>
      </div>
      <main className="page-content" id="main">
        <div className="status-bar">
          <div>
            <span
              className={`connection-dot ${offline.ready ? "ready" : ""}`}
            />
            <span role="status">{offline.message}</span>
            {!offline.online && (
              <span className="offline-badge">
                <WifiOff size={12} />
                Tanpa internet
              </span>
            )}
          </div>
          <div>
            {offline.ready ? (
              <span className="hint">
                <Check size={13} />
                Semua alat tersedia
              </span>
            ) : (
              <button
                className="text-link"
                onClick={() => void offline.retry()}
              >
                Cuba lagi
              </button>
            )}
            {installation.platform === "desktop" &&
              !installation.standalone &&
              !installation.installed &&
              installation.available && (
                <button
                  className="text-link"
                  disabled={installation.busy}
                  onClick={() => void installation.install()}
                >
                  <Download size={14} />
                  Pasang aplikasi
                </button>
              )}
            <button
              className="icon-button"
              aria-label="Cara pemasangan dan storan"
              onClick={openSettings}
            >
              <CircleHelp size={16} />
            </button>
          </div>
        </div>
        {offline.total > 0 && !offline.ready && (
          <progress
            aria-label="Persediaan luar talian"
            value={offline.checked}
            max={offline.total}
          />
        )}
        {offline.waiting && (
          <div className="update-banner">
            <span>
              Kemas kini sedia. Draf akan disimpan dan aktiviti dihentikan
              sebelum memuat semula.
            </span>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await diary.current?.flush();
                  pause();
                  offline.activate();
                } catch {
                  setStorageError(
                    "Kemas kini ditangguhkan kerana draf belum disimpan. Cuba simpan draf dahulu.",
                  );
                }
              }}
            >
              Kemas kini sekarang
            </button>
          </div>
        )}
        {storageError && (
          <div className="error storage-error" role="alert">
            {storageError}
            <button onClick={() => void refresh().catch(() => {})}>
              Cuba storan lagi
            </button>
          </div>
        )}
        {loading ? (
          <div className="card loading" role="status">
            Menyediakan ruang anda…
          </div>
        ) : !data.settings && !storageError ? (
          <Onboarding
            onSave={async (s, c) => {
              await repository.onboard(s, c);
              await refresh();
            }}
            onSOS={sos}
          />
        ) : null}
        <div className="welcome-row">
          <div>
            <span className="eyebrow">
              {new Intl.DateTimeFormat("ms-MY", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
                .format(today)
                .toUpperCase()}
            </span>
            <h2>
              Selamat datang
              {data.settings?.name
                ? `, ${data.settings.name}`
                : " ke ruang anda"}{" "}
              <span className="welcome-flower">✳</span>
            </h2>
          </div>
          <button className="text-link" onClick={() => setModal("history")}>
            <History size={16} />
            Lihat perjalanan anda <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="daily-card">
          <span className="daily-icon">
            <Sparkles size={26} strokeWidth={1.2} />
          </span>
          <div>
            <span className="eyebrow">PESANAN KECIL HARI INI</span>
            <p>
              {message[0]} <span>{message[1]}</span>
            </p>
          </div>
          <Heart size={22} strokeWidth={1.2} className="daily-heart" />
        </div>
        {(data.settings || storageError) && (
          <div className="dashboard-grid">
            <CheckInPanel
              key={`check-${epoch}`}
              onSOS={sos}
              onSave={async (c) => {
                await repository.saveCheck(c);
                await refresh();
              }}
            />
            {!loading && (
              <Diary
                key={`diary-${epoch}`}
                ref={diary}
                draft={data.draft}
                journals={data.journals}
                refresh={refresh}
              />
            )}
          </div>
        )}
        <Tools pauseSignal={pauseSignal} onSOS={sos} />
        <section className="journey-strip">
          <span className="round-icon">
            <BookHeart size={24} />
          </span>
          <div>
            <h3>Setiap kali anda hadir, ia bermakna.</h3>
            <p>
              {todayChecks.length
                ? `${todayChecks.length} check-in hari ini. Terima kasih kerana menjaga diri.`
                : "Perjalanan anda bermula dengan satu check-in kecil."}
            </p>
          </div>
          <button className="text-link" onClick={() => setModal("history")}>
            Lihat sejarah <ArrowUpRight size={16} />
          </button>
        </section>
        <section className="help-strip">
          <HeartHandshake size={28} strokeWidth={1.4} />
          <div>
            <h3>Anda tidak perlu melalui semuanya sendiri.</h3>
            <p>Jika keadaan terasa berat, sokongan ada untuk anda.</p>
          </div>
          <button className="secondary" onClick={sos}>
            Dapatkan sokongan <ArrowUpRight size={15} />
          </button>
        </section>
        <footer>
          <div>
            <Brand />
            <p>Sedikit ruang. Sedikit tenang.</p>
          </div>
          <p>
            Alat refleksi kendiri, bukan diagnosis atau pengganti bantuan
            profesional.
            <br />
            Catatan tidak dipantau. Data anda kekal pada peranti ini.
          </p>
          <button className="text-link" onClick={openSettings}>
            Privasi & storan <ShieldCheck size={14} />
          </button>
        </footer>
      </main>
      {mobileInstall && (
        <InstallBanner
          installation={installation}
          blocked={modal !== null}
          onGuide={(installed) => setModal(installed ? "installed" : "install")}
        />
      )}
      {(modal === "install" || modal === "installed") && (
        <Modal
          title={
            modal === "installed"
              ? "Buka dari skrin utama"
              : "Cara memasang Calm Corner"
          }
          onClose={close}
        >
          <InstallationGuide
            platform={installation.platform}
            installed={modal === "installed"}
          />
        </Modal>
      )}
      {modal === "sos" && (
        <Modal title="Kami di sini untuk membantu" onClose={close} wide>
          <SOS contacts={data.contacts} />
        </Modal>
      )}
      {modal === "settings" && (
        <Modal title="Ruang & tetapan anda" onClose={close} wide>
          <Settings
            contacts={data.contacts}
            refresh={refresh}
            onReset={reset}
            diary={diary}
            onPause={pause}
          />
        </Modal>
      )}
      {modal === "history" && (
        <Modal title="Perjalanan kecil anda" onClose={close} wide>
          <div className="history-list">
            <h3>Sejarah check-in</h3>
            {data.checks.length === 0 ? (
              <p>Belum ada check-in. Mulakan apabila anda bersedia.</p>
            ) : (
              data.checks.map((c) => (
                <article key={c.id}>
                  <span className="history-emoji">
                    {moods.find((m) => m.id === c.mood)?.emoji}
                  </span>
                  <div>
                    <strong>{moods.find((m) => m.id === c.mood)?.label}</strong>
                    <time>{localDate(c.createdAt)}</time>
                    <p>{c.factors.join(" · ") || "Tiada faktor dipilih"}</p>
                    <p>
                      {c.safety === "safe"
                        ? "Rasa selamat"
                        : c.safety === "unsure"
                          ? "Kurang pasti"
                          : "Tidak selamat"}{" "}
                      ·{" "}
                      {supportFor(c) === "green"
                        ? "Ruang refleksi"
                        : "Sokongan tersedia"}
                    </p>
                    {c.needs.length > 0 && <p>{c.needs.join(" · ")}</p>}
                  </div>
                  <button
                    className="text-link"
                    onClick={async () => {
                      if (confirm("Padam check-in ini?"))
                        try {
                          await repository.deleteCheck(c.id);
                          await refresh();
                        } catch {
                          setStorageError(
                            "Check-in tidak dapat dipadam. Cuba lagi.",
                          );
                        }
                    }}
                  >
                    Padam
                  </button>
                </article>
              ))
            )}
            <h3>Jurnal anda</h3>
            <p>{data.journals.length} catatan disimpan pada peranti ini.</p>
            <button
              className="secondary"
              onClick={() => {
                close();
                document
                  .getElementById("diary")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Buka Dear Diary <ArrowUpRight size={15} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Onboarding({
  onSave,
  onSOS,
}: {
  onSave: (s: Profile, c?: Contact) => Promise<void>;
  onSOS: () => void;
}) {
  const [name, setName] = useState("");
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section
      className="card onboarding"
      id="onboarding"
      tabIndex={-1}
      aria-label="Persediaan ruang anda"
    >
      <div className="onboarding-intro">
        <span className="round-icon">
          <Leaf size={24} />
        </span>
        <h2>Ruang yang hanya milik anda.</h2>
        <p>
          Tiada pendaftaran. Tiada kata laluan. Kenali diri pada rentak anda,
          walaupun tanpa internet.
        </p>
        <p className="hint">
          Untuk orang dewasa 18 tahun ke atas. Data disimpan hanya dalam pelayar
          ini, tanpa penyulitan aplikasi. Pengguna profil pelayar yang sama
          boleh melihatnya. Eksport sandaran sebelum memadam data pelayar.
        </p>
        <button className="text-link" onClick={onSOS}>
          Perlukan bantuan sekarang? <ArrowUpRight size={15} />
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const now = new Date().toISOString();
            await onSave(
              {
                id: "main",
                name: name.trim(),
                adult: true,
                consentVersion: 1,
                createdAt: now,
              },
              contact.trim()
                ? {
                    id: crypto.randomUUID(),
                    name: contact.trim(),
                    phone: phone.trim(),
                    relationship: relationship.trim(),
                    createdAt: now,
                    updatedAt: now,
                  }
                : undefined,
            );
            void navigator.storage?.persist?.().catch(() => {});
          } catch {
            setError("Maklumat belum disimpan. Semak kontak atau cuba lagi.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Panggil anda apa? <span>(pilihan)</span>
          <input
            maxLength={80}
            placeholder="Nama atau nama samaran"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <details>
          <summary>Tambah orang dipercayai (pilihan)</summary>
          <label className="field">
            Nama kontak
            <input
              maxLength={80}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </label>
          <label className="field">
            Hubungan
            <input
              maxLength={80}
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
          </label>
          <label className="field">
            Nombor telefon
            <input
              type="tel"
              required={!!contact.trim()}
              pattern="\+?[0-9 ()\-]{3,24}"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </details>
        <label className="check-label">
          <input
            type="checkbox"
            checked={adult}
            onChange={(e) => setAdult(e.target.checked)}
          />
          Saya berumur 18 tahun atau lebih.
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Saya faham cara data disimpan pada peranti ini.
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={!adult || !consent || busy}>
          {busy ? "Menyimpan…" : "Mulakan ruang saya"}
          <ArrowUpRight size={16} />
        </button>
      </form>
    </section>
  );
}
function SOS({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="sos-content">
      <div className="sos-intro">
        <HeartHandshake size={30} />
        <h3>Anda tidak bersendirian.</h3>
        <p>
          Terima kasih kerana berkongsi. Jika anda berada dalam bahaya sekarang,
          dapatkan bantuan kecemasan dan berada bersama orang yang dipercayai.
        </p>
      </div>
      <a className="emergency-call" href="tel:999">
        <Phone size={22} />
        <span>
          Hubungi 999 sekarang<small>Bahaya segera / kecemasan</small>
        </span>
        <ArrowUpRight />
      </a>
      <a className="secondary hotline" href="tel:15555">
        <Phone size={17} />
        Talian HEAL · 15555 <ArrowUpRight size={16} />
      </a>
      <p className="hint">
        Butang membuka pendail telefon. Panggilan memerlukan perkhidmatan
        telefon; aplikasi tidak menghubungi sesiapa secara automatik.
      </p>
      <div className="sos-stages">
        <section>
          <span className="stage-icon">🫂</span>
          <div>
            <h3>1 · Sokongan segera</h3>
            <p>
              Hubungi orang yang dipercayai. Anda tidak perlu menghadapi keadaan
              ini seorang diri.
            </p>
          </div>
        </section>
        <section>
          <span className="stage-icon">😟</span>
          <div>
            <h3>2 · Perlukan bantuan segera</h3>
            <p>
              Apabila tekanan semakin sukar dikawal, hubungi orang dipercayai
              atau Talian HEAL untuk sokongan.
            </p>
          </div>
        </section>
        <section>
          <span className="stage-icon">🆘</span>
          <div>
            <h3>3 · Kecemasan</h3>
            <p>
              Jika anda tidak selamat atau dalam bahaya segera, hubungi 999.
              Berada bersama orang lain sementara mendapatkan bantuan.
            </p>
          </div>
        </section>
      </div>
      <h3>Orang yang dipercayai</h3>
      {contacts.length ? (
        contacts.map((c) => (
          <div className="contact-row" key={c.id}>
            <div>
              <strong>{c.name}</strong>
              <p>
                {c.relationship} · {c.phone}
              </p>
            </div>
            <a
              className="secondary"
              href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}
            >
              <Phone size={15} />
              Hubungi
            </a>
          </div>
        ))
      ) : (
        <p>
          Belum ada kontak disimpan. Anda boleh mendail orang yang dipercayai
          melalui telefon anda, atau gunakan talian bantuan di atas.
        </p>
      )}
      <p className="hint">
        Maklumat Malaysia · sumber Kementerian Kesihatan Malaysia · semakan
        sumber: 5 September 2026.{" "}
        <a
          href="https://jknselangor.moh.gov.my/htar/en/pengumuman-awam/661-talian-heal-15555"
          target="_blank"
          rel="noreferrer"
        >
          Lihat sumber (internet diperlukan)
        </a>
        .
      </p>
    </div>
  );
}
