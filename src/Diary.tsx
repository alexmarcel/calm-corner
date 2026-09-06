import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { BookOpen, Check, Feather, Plus, Save, Trash2 } from "lucide-react";
import { repository, localDate, type Draft, type Journal } from "./data";
import { SectionHeading } from "./components";
export type DiaryHandle = {
  flush: () => Promise<void>;
  snapshot: () => Draft | undefined;
};
export default forwardRef<
  DiaryHandle,
  { draft?: Draft; journals: Journal[]; refresh: () => Promise<void> }
>(function Diary({ draft, journals, refresh }, ref) {
  const [body, setBody] = useState(draft?.body || "");
  const [note, setNote] = useState(draft?.note || "");
  const [entryId, setEntryId] = useState<string | null>(draft?.entryId || null);
  const [status, setStatus] = useState(draft ? "Draf dipulihkan" : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const queue = useRef(Promise.resolve());
  const dirty = useRef(false);
  const current = useRef({ body, note, entryId });
  current.current = { body, note, entryId };
  const mounted = useRef(true);
  const flush = async () => {
    if (!dirty.current) {
      await queue.current;
      return;
    }
    const snapshot = { ...current.current };
    dirty.current = false;
    const task = queue.current
      .catch(() => {})
      .then(() =>
        repository.saveDraft({
          id: "main",
          ...snapshot,
          updatedAt: new Date().toISOString(),
        }),
      );
    queue.current = task;
    try {
      await task;
      if (mounted.current) setStatus("Draf disimpan pada peranti");
    } catch (e) {
      dirty.current = true;
      if (mounted.current)
        setError(
          "Draf belum disimpan. Teks masih di sini. Cuba lagi atau eksport melalui Tetapan.",
        );
      throw e;
    }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useImperativeHandle(
    ref,
    () => ({
      flush: () => flushRef.current(),
      snapshot: () => {
        const v = current.current;
        return v.body || v.note
          ? { id: "main", ...v, updatedAt: new Date().toISOString() }
          : undefined;
      },
    }),
    [],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(
      () => void flushRef.current().catch(() => {}),
      700,
    );
    return () => clearTimeout(timer);
  }, [body, note, entryId]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const hide = () => {
      if (document.hidden) void flushRef.current().catch(() => {});
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  const edit = (j?: Journal) => {
    if (
      dirty.current &&
      !confirm(
        "Gantikan draf semasa? Simpan catatan anda dahulu jika diperlukan.",
      )
    )
      return;
    setBody(j?.body || "");
    setNote(j?.note || "");
    setEntryId(j?.id || null);
    dirty.current = true;
    setStatus("Draf belum disimpan");
  };
  return (
    <section className="card diary-card" id="diary">
      <SectionHeading
        number="02 / LUAHKAN RASA"
        title="Dear Diary"
        description="Cerita anda, ruang anda. Luahkan fikiran tanpa menghakimi diri."
      >
        <span className="round-icon">
          <Feather size={22} />
        </span>
      </SectionHeading>
      <div className="diary-date">
        <span>
          <span className="tiny-dot" />
          {new Intl.DateTimeFormat("ms-MY", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </span>
        <span>Untuk mata anda sahaja</span>
      </div>
      <div className="notebook">
        <span className="notebook-greeting">Dear me,</span>
        <label className="sr-only" htmlFor="journal">
          Catatan jurnal
        </label>
        <textarea
          disabled={busy}
          id="journal"
          maxLength={100000}
          placeholder={
            "Apa yang sedang bermain dalam fikiran anda?\n\nTuliskan apa sahaja. Di sini, anda boleh menjadi diri sendiri."
          }
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            dirty.current = true;
            setStatus("Menyimpan draf…");
          }}
        />
        <span className="notebook-flower" aria-hidden="true">
          ✳
        </span>
      </div>
      <div className="reflection-prompts">
        <span>Perlukan permulaan?</span>
        {[
          "Apa yang saya rasa sekarang?",
          "Apa satu perkara kecil yang membantu?",
        ].map((p) => (
          <button
            disabled={busy}
            key={p}
            onClick={() => {
              setBody((b) => b + (b ? "\n\n" : "") + p + "\n");
              dirty.current = true;
            }}
          >
            {p} <Plus size={12} />
          </button>
        ))}
      </div>
      <label className="sticky-note">
        <span>✧ Nota untuk diri sendiri</span>
        <textarea
          disabled={busy}
          maxLength={10000}
          placeholder="Lakukan yang terbaik hari ini. Itu sudah cukup bererti."
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            dirty.current = true;
            setStatus("Menyimpan draf…");
          }}
        />
      </label>
      <p className="privacy-small">
        <BookOpen size={14} />
        Catatan tidak dipantau atau dianalisis. Disimpan hanya pada peranti ini.
      </p>
      <p className="hint" role="status">
        {status}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button
            onClick={() =>
              void flush()
                .then(() => setError(""))
                .catch(() => {})
            }
          >
            Cuba simpan draf
          </button>
        </p>
      )}
      <div className="card-bottom">
        <button className="text-link" disabled={busy} onClick={() => edit()}>
          <Plus size={15} />
          Catatan baharu
        </button>
        <button
          className="primary"
          disabled={busy || (!body.trim() && !note.trim())}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await flush();
              await repository.saveJournal(body, note, entryId);
              dirty.current = false;
              setBody("");
              setNote("");
              setEntryId(null);
              setStatus("Catatan disimpan");
              await refresh();
            } catch {
              setError(
                "Catatan belum disimpan. Cuba lagi; teks anda dikekalkan.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save size={16} />
          {busy ? "Menyimpan…" : "Simpan catatan"}
        </button>
      </div>
      {journals.length > 0 && (
        <details className="journal-history">
          <summary>
            <Check size={15} />
            Catatan anda <span>{journals.length}</span>
          </summary>
          <div>
            {journals.map((j) => (
              <article key={j.id}>
                <time>{localDate(j.updatedAt)}</time>
                <p>{j.body || j.note}</p>
                <div>
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() => edit(j)}
                  >
                    Buka & edit
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Padam catatan ${localDate(j.updatedAt)}`}
                    disabled={busy}
                    onClick={async () => {
                      if (!confirm("Padam catatan ini?")) return;
                      setBusy(true);
                      try {
                        await flush();
                        await repository.deleteJournal(j.id);
                        if (entryId === j.id) {
                          dirty.current = false;
                          setEntryId(null);
                          setBody("");
                          setNote("");
                          setStatus("Catatan dipadam");
                        }
                        await refresh();
                      } catch {
                        setError("Catatan tidak dapat dipadam. Cuba lagi.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </details>
      )}
    </section>
  );
});
