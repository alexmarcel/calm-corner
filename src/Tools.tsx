import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  type Ref,
} from "react";
import {
  CloudRain,
  Waves,
  Trees,
  Coffee,
  Music2,
  Play,
  Pause,
  Square,
  Wind,
  Hand,
  Headphones,
  ArrowRight,
} from "lucide-react";
import { SectionHeading } from "./components";
import { Choice } from "./CheckIn";
const sounds = [
  {
    id: "rain",
    name: "Hujan",
    sub: "Rintik yang menenangkan",
    Icon: CloudRain,
  },
  { id: "ocean", name: "Ombak", sub: "Di tepi laut", Icon: Waves },
  { id: "forest", name: "Hutan", sub: "Kembali ke alam", Icon: Trees },
  { id: "cafe", name: "Kafe", sub: "Suasana hangat", Icon: Coffee },
  { id: "piano", name: "Piano", sub: "Melodi perlahan", Icon: Music2 },
];
const patterns = [
  {
    name: "Quick Calm",
    detail: "4–6 · Tenang seketika",
    phases: [4, 6],
    labels: ["Tarik nafas", "Hembus perlahan"],
    cues: ["inhale", "exhale"],
  },
  {
    name: "Anxiety Relief",
    detail: "4–4–4–4 · Box breathing",
    phases: [4, 4, 4, 4],
    labels: ["Tarik nafas", "Tahan", "Hembus perlahan", "Tahan"],
    cues: ["inhale", "hold", "exhale", "hold"],
  },
  {
    name: "Sleep Better",
    detail: "4–7–8 · Sebelum berehat",
    phases: [4, 7, 8],
    labels: ["Tarik nafas", "Tahan", "Hembus perlahan"],
    cues: ["inhale", "hold", "exhale"],
  },
];
const groundPrompts = [
  "Sebutkan 5 perkara yang anda boleh lihat.",
  "Sebutkan 4 perkara yang anda boleh sentuh.",
  "Sebutkan 3 bunyi yang anda boleh dengar.",
  "Sebutkan 2 perkara yang anda boleh hidu.",
  "Sebutkan 1 perkara yang anda boleh rasa.",
];
export type Tool = "sound" | "breathe" | "ground";
export type ToolsHandle = { select: (tool: Tool) => void };
export default function Tools({
  ref,
  pauseSignal,
  onSOS,
}: {
  ref?: Ref<ToolsHandle>;
  pauseSignal: number;
  onSOS: () => void;
}) {
  const [tab, setTab] = useState("sound");
  const [selected, setSelected] = useState("rain");
  const [duration, setDuration] = useState(5);
  const [remaining, setRemaining] = useState(300);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.45);
  const [audioError, setAudioError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const deadline = useRef(0);
  const [patternIndex, setPatternIndex] = useState(0);
  const [breathing, setBreathing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [spoken, setSpoken] = useState(false);
  const cue = useRef<HTMLAudioElement>(null);
  const [cueError, setCueError] = useState("");
  const pattern = patterns[patternIndex];
  const cycleLength = pattern.phases.reduce((a, b) => a + b, 0);
  const cycle = Math.min(4, Math.floor(elapsed / cycleLength) + 1);
  let phase = 0;
  let offset = elapsed % cycleLength;
  while (offset >= pattern.phases[phase] && phase < pattern.phases.length - 1) {
    offset -= pattern.phases[phase];
    phase++;
  }
  const [groundStep, setGroundStep] = useState(-1);
  const [answer, setAnswer] = useState("");
  const [groundSafety, setGroundSafety] = useState<string>();
  useEffect(() => {
    setPlaying(false);
    setBreathing(false);
    setGroundStep(-1);
    setGroundSafety(undefined);
    setAnswer("");
    cue.current?.pause();
  }, [pauseSignal]);
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    if (playing) {
      void player.play().catch(() => {
        setPlaying(false);
        setAudioError(
          "Audio tidak dapat dimainkan. Cuba lagi selepas muat turun luar talian lengkap.",
        );
      });
      deadline.current = Date.now() + remaining * 1000;
    } else player.pause();
    // remaining updates from the deadline; starting playback is the only event that sets it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const next = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(next);
      if (next === 0) setPlaying(false);
    }, 250);
    return () => clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    if (!breathing) return;
    const timer = setInterval(
      () =>
        setElapsed((v) => {
          if (v + 1 >= cycleLength * 4) {
            setBreathing(false);
            return cycleLength * 4;
          }
          return v + 1;
        }),
      1000,
    );
    return () => clearInterval(timer);
  }, [breathing, cycleLength]);
  useEffect(() => {
    if (!breathing || !spoken) {
      cue.current?.pause();
      return;
    }
    const p = cue.current;
    if (p) {
      p.src = `/audio/${pattern.cues[phase]}.wav`;
      void p
        .play()
        .catch(() =>
          setCueError("Panduan suara tidak tersedia. Ikuti arahan teks."),
        );
    }
  }, [breathing, spoken, phase, pattern]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        setBreathing(false);
        cue.current?.pause();
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  const changeTab = (next: string) => {
    setPlaying(false);
    setBreathing(false);
    setTab(next);
  };
  useImperativeHandle(ref, () => ({
    select(next: Tool) {
      changeTab(next);
      const target = document.getElementById("tool-" + next);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center", behavior: "instant" });
    },
  }));
  return (
    <section id="tools" className="tools-section">
      <SectionHeading
        number="03 / AMBIL NAFAS"
        title="Kembali kepada tenang"
        description="Tak perlu tergesa-gesa. Pilih satu perkara kecil untuk diri anda."
      />
      <div className="tool-tabs" role="group" aria-label="Aktiviti menenangkan">
        {[
          { id: "sound", name: "Soundscape", Icon: Headphones },
          { id: "breathe", name: "Breathe with me", Icon: Wind },
          { id: "ground", name: "Grounding", Icon: Hand },
        ].map((t) => (
          <button
            key={t.id}
            id={`tool-${t.id}`}
            aria-pressed={tab === t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => changeTab(t.id)}
          >
            <t.Icon size={17} />
            {t.name}
          </button>
        ))}
      </div>
      <div className="card tool-panel">
        <audio
          ref={audio}
          src={`/audio/${selected}.mp3`}
          loop
          preload="none"
          onError={() => {
            setAudioError(
              "Audio belum tersedia. Semak persediaan luar talian dan cuba lagi.",
            );
            setPlaying(false);
          }}
        />
        <audio ref={cue} preload="none" />
        {tab === "sound" && (
          <>
            <div className="sound-intro">
              <div>
                <h3>Biarkan dunia perlahan seketika.</h3>
                <p>Bunyi lembut untuk menemani ruang anda.</p>
              </div>
              <span className="offline-tag">5 bunyi · tanpa penstriman</span>
            </div>
            <div className="sound-grid">
              {sounds.map((s) => (
                <button
                  key={s.id}
                  className={`sound-tile ${s.id} ${selected === s.id ? "selected" : ""}`}
                  aria-pressed={selected === s.id}
                  onClick={() => {
                    setPlaying(false);
                    setSelected(s.id);
                    setRemaining(duration * 60);
                    setAudioError("");
                    if (audio.current) audio.current.currentTime = 0;
                  }}
                >
                  <s.Icon size={29} strokeWidth={1.3} />
                  <strong>{s.name}</strong>
                  <span>{s.sub}</span>
                  <span className="sound-select">
                    {selected === s.id ? "Dipilih" : "Pilih bunyi"}
                  </span>
                </button>
              ))}
            </div>
            <div className="player">
              <div className="player-controls">
                <button
                  className="play-button"
                  aria-label={playing ? "Jeda audio" : "Main audio"}
                  onClick={() => {
                    setAudioError("");
                    if (!remaining) setRemaining(duration * 60);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? <Pause size={21} /> : <Play size={21} />}
                </button>
                <button
                  className="icon-button"
                  aria-label="Hentikan audio"
                  onClick={() => {
                    setPlaying(false);
                    setRemaining(duration * 60);
                    if (audio.current) audio.current.currentTime = 0;
                  }}
                >
                  <Square size={17} />
                </button>
                <div>
                  <strong>{sounds.find((s) => s.id === selected)?.name}</strong>
                  <span>
                    {Math.floor(remaining / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(remaining % 60).toString().padStart(2, "0")} berbaki
                  </span>
                </div>
              </div>
              <label className="duration">
                Tempoh
                <select
                  value={duration}
                  disabled={playing}
                  onChange={(e) => {
                    setDuration(+e.target.value);
                    setRemaining(+e.target.value * 60);
                  }}
                >
                  {[5, 10, 15, 30].map((n) => (
                    <option key={n} value={n}>
                      {n} minit
                    </option>
                  ))}
                </select>
              </label>
              <label className="volume">
                Kelantangan
                <input
                  aria-label="Kelantangan audio"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(+e.target.value)}
                />
              </label>
            </div>
            {audioError && (
              <p className="error" role="alert">
                {audioError}
              </p>
            )}
            <p className="hint sound-credit">
              Landskap bunyi sintetik asli · tiada penstriman ·{" "}
              <a href="/audio/LICENSE.txt" target="_blank" rel="noreferrer">
                Kredit audio
              </a>
            </p>
          </>
        )}
        {tab === "breathe" && (
          <div className="breathing-layout">
            <div>
              <h3>Satu nafas pada satu masa.</h3>
              <p>
                Ikuti rentak yang selesa untuk anda. Berhenti bila-bila masa.
              </p>
              <label className="field">
                Pilih teknik
                <select
                  value={patternIndex}
                  disabled={breathing}
                  onChange={(e) => {
                    setPatternIndex(+e.target.value);
                    setElapsed(0);
                  }}
                >
                  {patterns.map((p, i) => (
                    <option value={i} key={p.name}>
                      {p.name} · {p.detail}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={spoken}
                  onChange={(e) => setSpoken(e.target.checked)}
                />
                Panduan suara (Bahasa Melayu)
              </label>
              <p className="hint">
                Empat kitaran. Sesi dijeda apabila aplikasi disembunyikan.
              </p>
              {cueError && <p role="status">{cueError}</p>}
              <div className="button-row">
                <button
                  className="primary"
                  onClick={() => {
                    if (elapsed >= cycleLength * 4) setElapsed(0);
                    setBreathing(!breathing);
                  }}
                >
                  {breathing ? <Pause size={16} /> : <Play size={16} />}{" "}
                  {breathing
                    ? "Jeda"
                    : elapsed > 0 && elapsed < cycleLength * 4
                      ? "Sambung"
                      : "Mula"}
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setBreathing(false);
                    setElapsed(0);
                  }}
                >
                  Hentikan
                </button>
              </div>
            </div>
            <div
              className="breathing-orb"
              style={{
                transform:
                  breathing && phase < (pattern.phases.length === 2 ? 1 : 2)
                    ? "scale(1.06)"
                    : "scale(1)",
                transitionDuration: `${pattern.phases[phase]}s`,
              }}
            >
              <div>
                <Wind size={28} />
                <strong>
                  {elapsed >= cycleLength * 4
                    ? "Selesai. Terima kasih."
                    : breathing
                      ? pattern.labels[phase]
                      : "Ruang untuk bernafas"}
                </strong>
                <span>
                  {breathing
                    ? `${pattern.phases[phase] - offset} saat · Kitaran ${cycle}/4`
                    : elapsed > 0 && elapsed < cycleLength * 4
                      ? "Dijeda"
                      : "Tarik perlahan. Lepaskan perlahan."}
                </span>
              </div>
            </div>
          </div>
        )}
        {tab === "ground" && (
          <div className="grounding">
            <div className="ground-visual" aria-hidden="true">
              <Hand size={44} strokeWidth={1} />
              <span>5 · 4 · 3 · 2 · 1</span>
            </div>
            <div>
              <h3>Kembali ke saat ini.</h3>
              <p>
                Gunakan deria anda untuk mengenali perkara di sekeliling.
                Jawapan latihan tidak disimpan atau dipantau.
              </p>
              {groundStep === -1 ? (
                <>
                  <Choice
                    label="Adakah anda rasa selamat untuk bermula?"
                    value={groundSafety}
                    choices={[
                      ["safe", "Ya, saya selamat"],
                      ["unsure", "Kurang pasti"],
                      ["unsafe", "Tidak selamat"],
                    ]}
                    onChange={(v) => {
                      setGroundSafety(v);
                      if (v === "unsafe") {
                        setAnswer("");
                        onSOS();
                      }
                    }}
                  />
                  {groundSafety === "unsure" && (
                    <p>
                      Anda boleh melihat sokongan dahulu.{" "}
                      <button className="text-link" onClick={onSOS}>
                        Lihat sokongan
                      </button>
                    </p>
                  )}
                  <button
                    className="primary"
                    disabled={groundSafety !== "safe"}
                    onClick={() => setGroundStep(0)}
                  >
                    Mula grounding <ArrowRight size={16} />
                  </button>
                </>
              ) : groundStep < 5 ? (
                <>
                  <span className="eyebrow">
                    LANGKAH {groundStep + 1} DARIPADA 5
                  </span>
                  <label className="field">
                    {groundPrompts[groundStep]}
                    <textarea
                      value={answer}
                      maxLength={5000}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Perhatikan perlahan-lahan…"
                    />
                  </label>
                  <div className="button-row">
                    <button
                      className="primary"
                      disabled={!answer.trim()}
                      onClick={() => {
                        setGroundStep((s) => s + 1);
                        setAnswer("");
                      }}
                    >
                      {groundStep === 4 ? "Selesai" : "Seterusnya"}
                      <ArrowRight size={16} />
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setGroundStep(-1);
                        setAnswer("");
                        setGroundSafety(undefined);
                      }}
                    >
                      Tamatkan latihan
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="support-note">
                    Anda telah memberi sedikit ruang kepada diri sendiri. Terima
                    kasih.
                  </div>
                  <button
                    className="secondary"
                    onClick={() => {
                      setGroundStep(-1);
                      setGroundSafety(undefined);
                      setAnswer("");
                    }}
                  >
                    Kembali
                  </button>
                </>
              )}
              <button
                className="text-link ground-help"
                onClick={() => {
                  setGroundStep(-1);
                  setGroundSafety(undefined);
                  setAnswer("");
                  onSOS();
                }}
              >
                Saya tidak rasa selamat — dapatkan bantuan
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
