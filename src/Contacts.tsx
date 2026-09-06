import { useEffect, useRef, useState } from "react";
import { contactSchema, repository, type Contact } from "./data";

export default function Contacts({
  contacts,
  refresh,
}: {
  contacts: Contact[];
  refresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Contact | null>(null);
  const original = useRef<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const root = useRef<HTMLElement>(null);
  const nameField = useRef<HTMLInputElement>(null);
  const editing = !!draft && contacts.some((c) => c.id === draft.id);
  useEffect(() => {
    if (draft?.id) nameField.current?.focus();
  }, [draft?.id]);
  const focus = (id?: string) =>
    requestAnimationFrame(() => {
      const target = id
        ? root.current?.querySelector<HTMLButtonElement>(`[data-edit="${id}"]`)
        : null;
      (
        target || root.current?.querySelector<HTMLButtonElement>("[data-add]")
      )?.focus();
    });
  const canDiscard = () =>
    !draft ||
    !original.current ||
    (draft.name === original.current.name &&
      draft.phone === original.current.phone &&
      draft.relationship === original.current.relationship) ||
    confirm("Buang perubahan kontak yang belum disimpan?");
  const begin = (contact?: Contact) => {
    if (working.current || !canDiscard()) return;
    const now = new Date().toISOString();
    const value = contact || {
      id: crypto.randomUUID(),
      name: "",
      relationship: "",
      phone: "",
      createdAt: now,
      updatedAt: now,
    };
    original.current = { ...value };
    setDraft({ ...value });
    requestAnimationFrame(() => nameField.current?.focus());
    setDeleting(null);
    setError("");
    setMessage("");
  };
  const cancel = () => {
    if (!canDiscard()) return;
    const id = editing ? draft?.id : undefined;
    setDraft(null);
    setError("");
    focus(id);
  };
  const save = async () => {
    if (!draft || working.current) return;
    const parsed = contactSchema.safeParse({
      ...draft,
      name: draft.name.trim(),
      relationship: draft.relationship.trim(),
      phone: draft.phone.trim(),
      updatedAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      setError("Semak nama dan nombor telefon kontak.");
      return;
    }
    working.current = true;
    setBusy(true);
    setError("");
    try {
      await repository.saveContact(parsed.data);
      await refresh();
      setDraft(null);
      setMessage("Kontak disimpan.");
      focus(parsed.data.id);
    } catch (e) {
      setError(
        e instanceof Error && e.message === "Had 20 kontak telah dicapai."
          ? e.message
          : "Kontak belum dapat disimpan. Maklumat anda dikekalkan. Cuba lagi.",
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!deleting || working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    const index = contacts.findIndex((c) => c.id === deleting.id);
    const next = contacts[index + 1]?.id || contacts[index - 1]?.id;
    try {
      await repository.deleteContact(deleting.id);
      await refresh();
      setDeleting(null);
      setMessage("Kontak dipadam.");
      focus(next);
    } catch {
      setError("Kontak belum dapat dipadam. Cuba lagi.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  return (
    <section
      className="card contacts-panel"
      id="contacts"
      tabIndex={-1}
      aria-labelledby="contacts-heading"
      ref={root}
    >
      <h2 id="contacts-heading">Orang yang dipercayai</h2>
      <p className="hint">
        Kontak untuk sokongan anda, disimpan pada peranti ini sahaja.
      </p>
      {!contacts.length && (
        <p>Belum ada kontak. Tambah seseorang yang anda percayai.</p>
      )}
      <ul className="trusted-contacts">
        {contacts.map((c) => (
          <li key={c.id}>
            <div className="trusted-contact-details">
              <h3>{c.name}</h3>
              {c.relationship && <p>{c.relationship}</p>}
              <p className="contact-phone">{c.phone}</p>
            </div>
            <div className="contact-actions">
              <button
                className="text-link"
                data-edit={c.id}
                aria-label={`Edit kontak ${c.name}`}
                disabled={busy}
                onClick={() => begin(c)}
              >
                Edit
              </button>
              <button
                className="text-link"
                aria-label={`Padam kontak ${c.name}`}
                disabled={busy}
                onClick={() => {
                  if (!canDiscard()) return;
                  setDraft(null);
                  setDeleting(c);
                  requestAnimationFrame(() =>
                    root.current
                      ?.querySelector<HTMLButtonElement>(
                        ".contact-confirm button",
                      )
                      ?.focus(),
                  );
                  setError("");
                  setMessage("");
                }}
              >
                Padam
              </button>
            </div>
            {deleting?.id === c.id && (
              <div
                className="contact-confirm"
                role="group"
                aria-label={`Pengesahan padam ${c.name}`}
              >
                <p>Padam kontak {c.name}?</p>
                <button
                  className="danger-outline"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  Padam
                </button>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => {
                    setDeleting(null);
                    setError("");
                    focus(c.id);
                  }}
                >
                  Batal
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <button
        data-add
        className="secondary"
        disabled={busy || contacts.length >= 20}
        onClick={() => begin()}
      >
        Tambah kontak
      </button>
      {contacts.length >= 20 && (
        <p className="hint">
          Had 20 kontak telah dicapai. Anda masih boleh mengedit atau memadam
          kontak.
        </p>
      )}
      {draft && (
        <form
          className="contact-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <h3>{editing ? "Edit kontak" : "Tambah kontak"}</h3>
          <label className="field">
            Nama kontak
            <input
              ref={nameField}
              required
              maxLength={80}
              disabled={busy}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="field">
            Hubungan (pilihan)
            <input
              maxLength={80}
              disabled={busy}
              value={draft.relationship}
              onChange={(e) =>
                setDraft({ ...draft, relationship: e.target.value })
              }
            />
          </label>
          <label className="field">
            Nombor telefon
            <input
              type="tel"
              required
              pattern="\+?[0-9 ()\-]{3,24}"
              disabled={busy}
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </label>
          <div className="contact-actions">
            <button
              className="secondary"
              type="submit"
              disabled={busy || !draft.name.trim()}
            >
              {editing ? "Simpan perubahan" : "Simpan kontak"}
            </button>
            <button
              className="text-link"
              type="button"
              disabled={busy}
              onClick={cancel}
            >
              Batal
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="hint" role="status">
        {message}
      </p>
    </section>
  );
}
