import test from "node:test";
import assert from "node:assert/strict";

import { createDeveloperNote, normalizeDeveloperNoteType } from "./developerNotes.js";

test("normalizeDeveloperNoteType identifies bug and feature requests", () => {
  assert.equal(normalizeDeveloperNoteType("Bug: login button is not working"), "Bug");
  assert.equal(normalizeDeveloperNoteType("Add export to PDF for reports"), "Feature");
  assert.equal(normalizeDeveloperNoteType("Please review attendance formula"), "Note");
});

test("createDeveloperNote rejects empty input and keeps a trimmed message", () => {
  assert.equal(createDeveloperNote("   "), null);

  const note = createDeveloperNote("Bug: attendance time is not syncing");
  assert.ok(note);
  assert.equal(note.text, "Bug: attendance time is not syncing");
  assert.equal(note.type, "Bug");
  assert.ok(note.id);
});
