import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CalmDatabase,
  createRepository,
  parseBackup,
  supportFor,
  type CheckInput,
} from "../src/data";
let db: CalmDatabase;
let repo: ReturnType<typeof createRepository>;
const check: CheckInput = {
  mood: "tenang",
  factors: ["Tidur / rehat"],
  burden: "tidak",
  impact: null,
  safety: "safe",
  needs: [],
};
beforeEach(() => {
  db = new CalmDatabase("test-" + crypto.randomUUID());
  repo = createRepository(db);
});
afterEach(async () => {
  await db.delete();
});
describe("explicit support routing", () => {
  it("never assumes unanswered safety or incomplete check-ins are safe", () => {
    expect(supportFor({})).toBe("unknown");
    expect(supportFor({ safety: "safe" })).toBe("unknown");
    expect(supportFor({ ...check, safety: undefined })).toBe("unknown");
  });
  it("routes unsafe immediately, even before other questions", () => {
    expect(supportFor({ safety: "unsafe" })).toBe("red");
  });
  it("routes unsure and reported distress to support", () => {
    expect(supportFor({ ...check, safety: "unsure" })).toBe("yellow");
    expect(supportFor({ ...check, mood: "sedih" })).toBe("yellow");
    expect(supportFor({ ...check, burden: "kadang", impact: "sedikit" })).toBe(
      "yellow",
    );
  });
  it("offers reflection for completed safe/no-distress answers", () => {
    expect(supportFor(check)).toBe("green");
  });
});
describe("local repository", () => {
  it("persists, edits and deletes journals across connections, without classifying text", async () => {
    await repo.saveDraft({
      id: "main",
      entryId: null,
      body: "pisau di atas meja",
      note: "",
      updatedAt: new Date().toISOString(),
    });
    const j = await repo.saveJournal("pisau di atas meja", "nota", null);
    expect((await repo.load()).draft).toBeUndefined();
    db.close();
    await db.open();
    expect((await repo.load()).journals[0].body).toBe("pisau di atas meja");
    await repo.saveJournal("dikemas kini", "", j.id);
    expect((await repo.load()).journals).toHaveLength(1);
    await repo.deleteJournal(j.id);
    expect((await repo.load()).journals).toHaveLength(0);
  });
  it("round trips full backup and validates before destructive restore", async () => {
    await repo.saveCheck(check);
    await repo.saveJournal("asal", "nota", null);
    const before = await repo.exportData();
    await expect(repo.restore({ ...before, version: 2 })).rejects.toThrow();
    expect((await repo.load()).journals[0].body).toBe("asal");
    await repo.clear();
    await repo.restore(parseBackup(JSON.stringify(before)));
    expect((await repo.load()).checks).toHaveLength(1);
    expect((await repo.load()).journals[0].body).toBe("asal");
  });
  it("rejects invalid types, unsafe contact URLs, duplicate IDs and unknown keys", async () => {
    const backup = await repo.exportData();
    const j = await repo.saveJournal("a", "", null);
    expect(() =>
      parseBackup(JSON.stringify({ ...backup, journalEntries: [j, j] })),
    ).toThrow();
    expect(() => parseBackup("{bad")).toThrow();
    await expect(repo.restore({ ...backup, extra: true })).rejects.toThrow();
    await expect(
      repo.saveContact({
        id: crypto.randomUUID(),
        name: "A",
        relationship: "",
        phone: "javascript:alert(1)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow();
  });
  it("propagates write failure rather than claiming successful storage", async () => {
    db.journalEntries.hook("creating", () => {
      throw new DOMException("Quota full", "QuotaExceededError");
    });
    await expect(repo.saveJournal("retain input", "", null)).rejects.toThrow();
    expect((await repo.load()).journals).toHaveLength(0);
  });
  it("rolls back all tables when a restore transaction fails", async () => {
    await repo.saveJournal("original", "", null);
    const backup = await repo.exportData();
    db.journalEntries.hook("creating", () => {
      throw new Error("write failed");
    });
    await expect(repo.restore(backup)).rejects.toThrow();
    expect((await repo.load()).journals[0].body).toBe("original");
  });
  it("upgrades v1 database without losing records", async () => {
    const name = "migration-" + crypto.randomUUID();
    const old = new Dexie(name);
    old.version(1).stores({
      settings: "id",
      trustedContacts: "id",
      checkIns: "id, createdAt",
      journalEntries: "id, updatedAt",
      journalDrafts: "id",
    });
    await old.table("journalEntries").put({
      id: crypto.randomUUID(),
      body: "before upgrade",
      note: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    old.close();
    const next = new CalmDatabase(name);
    expect((await createRepository(next).load()).journals[0].body).toBe(
      "before upgrade",
    );
    expect(next.verno).toBe(2);
    await next.delete();
  });
});

describe("trusted contacts", () => {
  const contact = (name = "Aina") => {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      name,
      relationship: "Kawan",
      phone: "+60123456789",
      createdAt: now,
      updatedAt: now,
    };
  };
  it("preserves identity and backup compatibility when editing and deleting", async () => {
    const first = contact();
    await repo.saveContact(first);
    await repo.saveContact({
      ...first,
      name: "Aina Baru",
      updatedAt: "2026-09-07T00:00:00.000Z",
    });
    db.close();
    await db.open();
    const saved = (await repo.load()).contacts;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id: first.id,
      createdAt: first.createdAt,
      name: "Aina Baru",
    });
    const backup = parseBackup(JSON.stringify(await repo.exportData()));
    await repo.clear();
    await repo.restore(backup);
    expect((await repo.load()).contacts).toEqual(saved);
    await repo.deleteContact(first.id);
    expect((await repo.load()).contacts).toHaveLength(0);
  });
  it("enforces the cap across concurrent inserts but allows updates", async () => {
    const records = Array.from({ length: 19 }, () => contact());
    for (const record of records) await repo.saveContact(record);
    const result = await Promise.allSettled([
      repo.saveContact(contact()),
      repo.saveContact(contact()),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await repo.load()).contacts).toHaveLength(20);
    await repo.saveContact({ ...records[0], name: "Edited at capacity" });
    expect(
      (await repo.load()).contacts.find((c) => c.id === records[0].id)?.name,
    ).toBe("Edited at capacity");
    await repo.deleteContact(records[1].id);
    await repo.saveContact(contact());
    expect((await repo.load()).contacts).toHaveLength(20);
  });
});
