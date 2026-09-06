import { useState } from "react";
import { ArrowRight, Check, HeartHandshake } from "lucide-react";
import { factors, needs, moods, supportFor, type CheckInput } from "./data";
import { SectionHeading } from "./components";
const toggle = (items: string[], item: string) =>
  items.includes(item) ? items.filter((x) => x !== item) : [...items, item];
export default function CheckInPanel({
  onSave,
  onSOS,
}: {
  onSave: (c: CheckInput) => Promise<void>;
  onSOS: () => void;
}) {
  const [input, setInput] = useState<Partial<CheckInput>>({
    factors: [],
    needs: [],
    impact: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const change = (patch: Partial<CheckInput>) => {
    setInput((x) => ({ ...x, ...patch }));
    setSaved(false);
  };
  const level = supportFor(input);
  const complete = !!(
    input.mood &&
    input.burden &&
    input.safety &&
    (input.burden === "tidak" || input.impact)
  );
  return (
    <section
      className="card check-card"
      id="checkin"
      tabIndex={-1}
      aria-label="Check-in"
    >
      <SectionHeading
        number="01 / KENALI DIRI"
        title="Apa khabar hati hari ini?"
        description="Tiada jawapan yang betul atau salah. Pilih yang paling dekat dengan anda."
      />
      <fieldset>
        <legend className="sr-only">Pilih emosi</legend>
        <div className="mood-grid">
          {moods.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={input.mood === m.id}
              className={`mood ${input.mood === m.id ? "selected" : ""}`}
              style={{ "--mood": m.color } as React.CSSProperties}
              onClick={() => change({ mood: m.id })}
            >
              <span className="mood-face">{m.emoji}</span>
              <span>{m.label}</span>
              {input.mood === m.id && (
                <Check size={12} className="mood-check" />
              )}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="form-section">
        <legend>Apa yang mempengaruhi perasaan anda?</legend>
        <p className="hint">Pilih semua yang berkaitan.</p>
        <div className="chips">
          {factors.map((f, i) => (
            <button
              key={f}
              aria-pressed={input.factors?.includes(f)}
              className={`chip ${input.factors?.includes(f) ? "active" : ""}`}
              onClick={() =>
                change({ factors: toggle(input.factors || [], f) })
              }
            >
              <span aria-hidden="true">
                {["◷", "⌂", "♧", "♡", "☾", "✧", "?"][i]}
              </span>
              {f}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="wellbeing" id="wellbeing">
        <div className="mini-heading">
          <HeartHandshake size={18} />
          <h3>Sedikit ruang untuk bertanya</h3>
        </div>
        <p className="hint">Semakan ringkas kesejahteraan anda.</p>
        <Choice
          label="Sejak kebelakangan ini, pernahkah anda rasa hidup menjadi terlalu berat untuk dihadapi?"
          value={input.burden}
          choices={[
            ["tidak", "Tidak"],
            ["kadang", "Kadang-kadang"],
            ["ya", "Ya"],
          ]}
          onChange={(v) =>
            change({ burden: v as CheckInput["burden"], impact: null })
          }
        />
        {input.burden && input.burden !== "tidak" && (
          <Choice
            label="Bila perasaan itu datang, sejauh mana ia mengganggu anda?"
            value={input.impact || undefined}
            choices={[
              ["sedikit", "Sedikit"],
              ["agak", "Agak mengganggu"],
              ["sangat", "Sangat mengganggu"],
            ]}
            onChange={(v) => change({ impact: v as CheckInput["impact"] })}
          />
        )}
        <Choice
          label="Buat masa ini, adakah anda rasa selamat?"
          value={input.safety}
          choices={[
            ["safe", "Ya, saya selamat"],
            ["unsure", "Saya kurang pasti"],
            ["unsafe", "Saya tidak selamat"],
          ]}
          onChange={(v) => {
            change({ safety: v as CheckInput["safety"] });
            if (v === "unsafe") onSOS();
          }}
        />
      </div>
      {(level === "yellow" || level === "red") && (
        <div className="support-note">
          <HeartHandshake size={22} />
          <div>
            <strong>Anda tidak perlu menghadapinya seorang diri.</strong>
            <p>
              Terima kasih kerana berkongsi. Anda boleh melihat pilihan sokongan
              atau mencuba aktiviti menenangkan.
            </p>
            <button className="text-link" onClick={onSOS}>
              Lihat pilihan sokongan <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}
      <fieldset className="form-section">
        <legend>Apa yang anda perlukan sekarang?</legend>
        <p className="hint">
          Pilih lebih daripada satu, atau teruskan apabila bersedia.
        </p>
        <div className="chips">
          {needs.map((n) => (
            <button
              key={n}
              className={`chip ${input.needs?.includes(n) ? "active" : ""}`}
              aria-pressed={input.needs?.includes(n)}
              onClick={() => change({ needs: toggle(input.needs || [], n) })}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      {!!input.needs?.length && (
        <p className="recommendation">
          {input.needs.includes("Aktiviti menenangkan")
            ? "Cuba satu sesi pernafasan atau dengarkan bunyi yang anda sukai. "
            : ""}
          {input.needs.some((n) =>
            [
              "Seseorang untuk mendengar",
              "Sokongan orang dipercayai",
              "Bantuan profesional",
            ].includes(n),
          )
            ? "Anda boleh menghubungi seseorang melalui pilihan sokongan. "
            : ""}
          {input.needs.includes("Masa untuk diri sendiri")
            ? "Luangkan sedikit masa untuk berehat atau menulis di Dear Diary."
            : ""}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="card-bottom">
        <span className="hint">
          {saved
            ? "Check-in disimpan pada peranti ini."
            : "Satu langkah kecil untuk diri anda."}
        </span>
        <button
          className="primary"
          disabled={!complete || saving || saved}
          onClick={async () => {
            setSaving(true);
            setError("");
            try {
              await onSave(input as CheckInput);
              setSaved(true);
            } catch {
              setError(
                "Belum disimpan. Jawapan anda masih di sini. Cuba lagi atau eksport data melalui Tetapan.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Menyimpan…" : saved ? "Disimpan" : "Simpan check-in"}
          {saved ? <Check size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>
      {saved && (
        <div className="summary" aria-live="polite">
          <h3>Ringkasan hari ini</h3>
          <dl>
            <dt>Emosi</dt>
            <dd>{moods.find((m) => m.id === input.mood)?.label}</dd>
            <dt>Faktor</dt>
            <dd>{input.factors?.join(", ") || "Tidak dipilih"}</dd>
            <dt>Tahap gangguan</dt>
            <dd>{input.impact || "Tidak dilaporkan"}</dd>
            <dt>Keselamatan</dt>
            <dd>
              {input.safety === "safe"
                ? "Rasa selamat"
                : input.safety === "unsure"
                  ? "Kurang pasti"
                  : "Tidak selamat"}
            </dd>
            <dt>Keperluan</dt>
            <dd>{input.needs?.join(", ") || "Tidak dipilih"}</dd>
          </dl>
          <p>
            Terima kasih kerana meluangkan masa untuk mengenali perasaan anda
            hari ini.
          </p>
        </div>
      )}
    </section>
  );
}
export function Choice({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value?: string;
  choices: string[][];
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="question">
      <legend>{label}</legend>
      <div className="choice-row">
        {choices.map(([v, l]) => (
          <button
            type="button"
            key={v}
            className={`choice ${value === v ? "active" : ""}`}
            aria-pressed={value === v}
            onClick={() => onChange(v)}
          >
            <span className="radio-dot" />
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
