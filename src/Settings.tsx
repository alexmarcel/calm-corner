import { InstallationGuide } from "./InstallBanner";
import { useState, type RefObject } from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  Trash2,
  Smartphone,
} from "lucide-react";
import { repository, parseBackup, downloadBackup, type Backup } from "./data";
import type { DiaryHandle } from "./Diary";
export default function Settings({
  onContacts,
  onReset,
  diary,
  onPause,
}: {
  onContacts: () => void;
  onReset: () => void;
  diary: RefObject<DiaryHandle | null>;
  onPause: () => void;
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Backup>();
  const [busy, setBusy] = useState(false);
  const [persistence, setPersistence] = useState("");
  const perform = async (fn: () => Promise<void>, flush = true) => {
    setBusy(true);
    setError("");
    try {
      if (flush) await diary.current?.flush();
      await fn();
    } catch {
      setError("Operasi tidak berjaya. Data sedia ada dikekalkan. Cuba lagi.");
    } finally {
      setBusy(false);
    }
  };
  const backup = () =>
    perform(async () => {
      const data = await repository.exportData();
      const draft = diary.current?.snapshot();
      if (draft) data.journalDrafts = [draft];
      downloadBackup(data);
      setMessage(
        "Fail sandaran dimuat turun, termasuk draf semasa. Simpan di tempat peribadi.",
      );
    }, false);
  return (
    <div className="settings-content">
      <div className="info-block">
        <ShieldCheck size={25} />
        <div>
          <h3>Peribadi. Pada peranti anda.</h3>
          <p>
            Tiada akaun, pelayan atau penyegerakan. Data tidak disulitkan oleh
            aplikasi dan boleh diakses oleh orang yang menggunakan profil
            pelayar ini. Memadam data pelayar boleh memadam catatan anda.
          </p>
        </div>
      </div>
      <section>
        <h3>Sandaran & storan</h3>
        <p>
          Sandaran JSON mengandungi catatan dan nombor telefon yang boleh
          dibaca. Simpan fail ini secara peribadi.
        </p>
        <div className="button-row">
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void backup()}
          >
            <Download size={16} />
            Eksport sandaran
          </button>
          <label className={`secondary file-label ${busy ? "disabled" : ""}`}>
            <Upload size={16} />
            Pulihkan sandaran
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              aria-label="Pulihkan sandaran JSON"
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 20 * 1024 * 1024) throw new Error();
                  setPending(parseBackup(await file.text()));
                  setError("");
                } catch {
                  setError(
                    "Fail tidak sah atau versi tidak disokong (maksimum 20 MB). Tiada data diubah.",
                  );
                } finally {
                  input.value = "";
                }
              }}
            />
          </label>
        </div>
        {pending && (
          <div className="restore-confirm">
            <h4>Gantikan data pada peranti ini?</h4>
            <p>
              Sandaran mengandungi {pending.journalEntries.length} catatan dan{" "}
              {pending.checkIns.length} check-in. Semua data semasa akan
              digantikan. Eksport dahulu jika perlu.
            </p>
            <div className="button-row">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void backup()}
              >
                Eksport data semasa
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    onPause();
                    await repository.restore(pending);
                    setPending(undefined);
                    onReset();
                  })
                }
              >
                Ya, gantikan & pulihkan
              </button>
              <button
                className="text-link"
                onClick={() => setPending(undefined)}
              >
                Batal
              </button>
            </div>
          </div>
        )}
        <button
          className="text-link"
          onClick={async () => {
            try {
              const result = await navigator.storage?.persist?.();
              setPersistence(
                result
                  ? "Storan berterusan dibenarkan. Sandaran masih disarankan."
                  : "Pelayar tidak memberi storan berterusan. Eksport sandaran secara berkala.",
              );
            } catch {
              setPersistence(
                "Permintaan tidak tersedia. Gunakan sandaran untuk menyimpan salinan.",
              );
            }
          }}
        >
          Minta storan berterusan
        </button>
        <p role="status" className="hint">
          {persistence}
        </p>
      </section>
      <section>
        <h3>Orang yang dipercayai</h3>
        <p>Kontak disimpan pada peranti ini sahaja.</p>
        <button className="secondary" onClick={onContacts}>
          Urus orang yang dipercayai
        </button>
      </section>
      <section>
        <h3>
          <Smartphone size={18} /> Pasang pada peranti
        </h3>
        <InstallationGuide />
        <p>
          Lawatan pertama memerlukan internet. Tunggu “Sedia luar talian”
          sebelum menutup aplikasi. Muat turun kemas kini memerlukan internet.
        </p>
      </section>
      <section>
        <h3>Padam data peribadi</h3>
        <p>
          Memadam profil, kontak, sejarah, draf dan jurnal. Aplikasi serta audio
          luar talian kekal tersedia.
        </p>
        <button
          className="danger-outline"
          disabled={busy}
          onClick={() => {
            if (
              confirm(
                "Padam semua data peribadi pada peranti ini? Tindakan ini tidak boleh dibatalkan. Eksport sandaran dahulu jika perlu.",
              )
            )
              void perform(async () => {
                onPause();
                await repository.clear();
                onReset();
              });
          }}
        >
          <Trash2 size={16} />
          Padam semua data saya
        </button>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
