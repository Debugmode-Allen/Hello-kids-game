import test from "node:test";
import assert from "node:assert/strict";
import { mergeCompanionProfiles, grantCompanion, pendingCompanionIntro } from "../js/companion-rewards.js";
const dummy = { id: "training-dummy" };
test("first boss grant is unique and keeps its tutorial pending across reloads", () => {
  const first = grantCompanion({}, dummy.id);
  assert.equal(first.added, true);
  assert.equal(pendingCompanionIntro(first.profile, [dummy]), dummy);
  const repeat = grantCompanion(first.profile, dummy.id);
  assert.equal(repeat.added, false);
  assert.deepEqual(repeat.profile.companionIds, [dummy.id]);
  assert.deepEqual(repeat.profile.pendingCompanionIds, [dummy.id]);
});
test("existing and test-granted companions do not trigger acquisition", () => {
  assert.equal(pendingCompanionIntro(grantCompanion({ companionIds: [dummy.id] }, dummy.id).profile, [dummy]), undefined);
  assert.equal(pendingCompanionIntro(grantCompanion({}, dummy.id, true).profile, [dummy]), undefined);
});
test("cloud and local ownership are merged without losing rewards or replaying completed intros", () => {
  const merged = mergeCompanionProfiles({ companionIds: ["other"], pendingCompanionIds: [dummy.id] }, { companionIds: [dummy.id], introducedCompanionIds: [dummy.id] });
  assert.deepEqual(merged.companionIds, ["other", dummy.id]);
  assert.equal(pendingCompanionIntro(merged, [dummy]), undefined);
});
