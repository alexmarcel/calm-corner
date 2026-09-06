import Dexie, { type Table } from "dexie";
import { z } from "zod";

export const moods = [
  { id: "baik", label: "Baik", emoji: "😊", color: "#f5e5aa" },
  { id: "tenang", label: "Tenang", emoji: "😌", color: "#d8e8d4" },
  { id: "biasa", label: "Biasa sahaja", emoji: "😐", color: "#e9e5dc" },
  { id: "sedih", label: "Sedih", emoji: "😔", color: "#dce7f3" },
  { id: "risau", label: "Risau", emoji: "😟", color: "#e8e0f1" },
  { id: "tertekan", label: "Tertekan", emoji: "😣", color: "#f3ded4" },
  { id: "marah", label: "Marah", emoji: "😤", color: "#ecd9cb" },
  { id: "letih", label: "Letih", emoji: "😴", color: "#e1e3f1" },
] as const;
export const factors = [
  "Sekolah / kerja",
  "Keluarga",
  "Kawan",
  "Diri sendiri",
  "Tidur / rehat",
  "Perkara lain",
  "Tidak pasti",
];
export const needs = [
  "Masa untuk diri sendiri",
  "Seseorang untuk mendengar",
  "Sokongan orang dipercayai",
  "Aktiviti menenangkan",
  "Bantuan profesional",
];
export const moodSchema = z.enum([
  "baik",
  "tenang",
  "biasa",
  "sedih",
  "risau",
  "tertekan",
  "marah",
  "letih",
]);
const id = z.string().uuid();
const date = z.string().datetime();
const text = z.string().max(100000);
export const settingsSchema = z
  .object({
    id: z.literal("main"),
    name: z.string().max(80),
    adult: z.literal(true),
    consentVersion: z.literal(1),
    createdAt: date,
  })
  .strict();
export const contactSchema = z
  .object({
    id,
    name: z.string().min(1).max(80),
    relationship: z.string().max(80),
    phone: z.string().regex(/^\+?[\d ()-]{3,24}$/),
    createdAt: date,
    updatedAt: date,
  })
  .strict();
export const checkSchema = z
  .object({
    id,
    mood: moodSchema,
    factors: z.array(z.string().refine((x) => factors.includes(x))).max(7),
    burden: z.enum(["tidak", "kadang", "ya"]),
    impact: z.enum(["sedikit", "agak", "sangat"]).nullable(),
    safety: z.enum(["safe", "unsure", "unsafe"]),
    needs: z.array(z.string().refine((x) => needs.includes(x))).max(5),
    createdAt: date,
  })
  .strict();
export const journalSchema = z
  .object({
    id,
    body: text,
    note: z.string().max(10000),
    createdAt: date,
    updatedAt: date,
  })
  .strict();
export const draftSchema = z
  .object({
    id: z.literal("main"),
    entryId: id.nullable(),
    body: text,
    note: z.string().max(10000),
    updatedAt: date,
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type CheckIn = z.infer<typeof checkSchema>;
export type Journal = z.infer<typeof journalSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type CheckInput = Omit<CheckIn, "id" | "createdAt">;
export type Support = "unknown" | "green" | "yellow" | "red";
export function supportFor(c: Partial<CheckInput>): Support {
  if (c.safety === "unsafe") return "red";
  if (!c.safety) return "unknown";
  if (
    c.safety === "unsure" ||
    (c.burden && c.burden !== "tidak") ||
    (c.mood && !["baik", "tenang", "biasa"].includes(c.mood))
  )
    return "yellow";
  if (!c.mood || !c.burden || (c.burden !== "tidak" && !c.impact))
    return "unknown";
  return "green";
}
export class CalmDatabase extends Dexie {
  settings!: Table<Settings, string>;
  trustedContacts!: Table<Contact, string>;
  checkIns!: Table<CheckIn, string>;
  journalEntries!: Table<Journal, string>;
  journalDrafts!: Table<Draft, string>;
  constructor(name = "calm-corner") {
    super(name);
    this.version(1).stores({
      settings: "id",
      trustedContacts: "id",
      checkIns: "id, createdAt",
      journalEntries: "id, updatedAt",
      journalDrafts: "id",
    });
    this.version(2).stores({ checkIns: "id, createdAt, mood" });
  }
}
const backupSchema = z
  .object({
    app: z.literal("calm-corner"),
    version: z.literal(1),
    exportedAt: date,
    settings: z.array(settingsSchema).max(1),
    trustedContacts: z.array(contactSchema).max(20),
    checkIns: z.array(checkSchema).max(50000),
    journalEntries: z.array(journalSchema).max(50000),
    journalDrafts: z.array(draftSchema).max(1),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const k of ["trustedContacts", "checkIns", "journalEntries"] as const)
      if (new Set(v[k].map((x) => x.id)).size !== v[k].length)
        ctx.addIssue({ code: "custom", message: "Duplicate IDs" });
    const entry = v.journalDrafts[0]?.entryId;
    if (entry && !v.journalEntries.some((x) => x.id === entry))
      ctx.addIssue({ code: "custom", message: "Draft entry missing" });
  });
export type Backup = z.infer<typeof backupSchema>;
export function parseBackup(raw: string): Backup {
  return backupSchema.parse(JSON.parse(raw));
}
export function createRepository(db: CalmDatabase) {
  return {
    async load() {
      const [settings, contacts, checks, journals, draft] = await Promise.all([
        db.settings.get("main"),
        db.trustedContacts.toArray(),
        db.checkIns.orderBy("createdAt").reverse().toArray(),
        db.journalEntries.orderBy("updatedAt").reverse().toArray(),
        db.journalDrafts.get("main"),
      ]);
      return { settings, contacts, checks, journals, draft };
    },
    async onboard(settings: Settings, contact?: Contact) {
      await db.transaction(
        "rw",
        [db.settings, db.trustedContacts],
        async () => {
          await db.settings.put(settingsSchema.parse(settings));
          if (contact) {
            const record = contactSchema.parse(contact);
            if (
              !(await db.trustedContacts.get(record.id)) &&
              (await db.trustedContacts.count()) >= 20
            )
              throw new Error("Had 20 kontak telah dicapai.");
            await db.trustedContacts.put(record);
          }
        },
      );
    },
    async saveContact(contact: Contact) {
      const record = contactSchema.parse(contact);
      await db.transaction("rw", db.trustedContacts, async () => {
        if (
          !(await db.trustedContacts.get(record.id)) &&
          (await db.trustedContacts.count()) >= 20
        ) {
          throw new Error("Had 20 kontak telah dicapai.");
        }
        await db.trustedContacts.put(record);
      });
    },
    async deleteContact(id: string) {
      await db.trustedContacts.delete(id);
    },
    async saveCheck(input: CheckInput) {
      const record = checkSchema.parse({
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
      await db.checkIns.add(record);
      return record;
    },
    async deleteCheck(id: string) {
      await db.checkIns.delete(id);
    },
    async saveDraft(draft: Draft) {
      await db.journalDrafts.put(draftSchema.parse(draft));
    },
    async saveJournal(body: string, note: string, entryId: string | null) {
      return db.transaction(
        "rw",
        [db.journalEntries, db.journalDrafts],
        async () => {
          const existing = entryId
            ? await db.journalEntries.get(entryId)
            : null;
          if (entryId && !existing) throw new Error("Entry no longer exists");
          const now = new Date().toISOString();
          const record = journalSchema.parse({
            id: entryId || crypto.randomUUID(),
            body,
            note,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
          });
          await db.journalEntries.put(record);
          await db.journalDrafts.delete("main");
          return record;
        },
      );
    },
    async deleteJournal(id: string) {
      await db.transaction(
        "rw",
        [db.journalEntries, db.journalDrafts],
        async () => {
          await db.journalEntries.delete(id);
          if ((await db.journalDrafts.get("main"))?.entryId === id)
            await db.journalDrafts.delete("main");
        },
      );
    },
    async exportData(): Promise<Backup> {
      return db.transaction("r", db.tables, async () => ({
        app: "calm-corner",
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: await db.settings.toArray(),
        trustedContacts: await db.trustedContacts.toArray(),
        checkIns: await db.checkIns.toArray(),
        journalEntries: await db.journalEntries.toArray(),
        journalDrafts: await db.journalDrafts.toArray(),
      }));
    },
    async restore(raw: unknown) {
      const data = backupSchema.parse(raw);
      await db.transaction("rw", db.tables, async () => {
        for (const t of db.tables) await t.clear();
        await db.settings.bulkPut(data.settings);
        await db.trustedContacts.bulkPut(data.trustedContacts);
        await db.checkIns.bulkPut(data.checkIns);
        await db.journalEntries.bulkPut(data.journalEntries);
        await db.journalDrafts.bulkPut(data.journalDrafts);
      });
    },
    async clear() {
      await db.transaction("rw", db.tables, async () => {
        for (const t of db.tables) await t.clear();
      });
    },
  };
}
export const repository = createRepository(new CalmDatabase());
export const emptyData = {
  settings: undefined as Settings | undefined,
  contacts: [] as Contact[],
  checks: [] as CheckIn[],
  journals: [] as Journal[],
  draft: undefined as Draft | undefined,
};
export function downloadBackup(data: Backup) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `calm-corner-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const localDate = (date: string) =>
  new Intl.DateTimeFormat("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
