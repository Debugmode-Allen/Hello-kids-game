// Pure profile operations shared by cloud transactions, browser fallback and tests.
export function mergeCompanionProfiles(...profiles) {
  return {
    companionIds: [...new Set(profiles.flatMap((profile) => profile?.companionIds || []))],
    pendingCompanionIds: [...new Set(profiles.flatMap((profile) => profile?.pendingCompanionIds || []))],
    introducedCompanionIds: [...new Set(profiles.flatMap((profile) => profile?.introducedCompanionIds || []))]
  };
}

export function grantCompanion(profile, id, alreadyOwned = false) {
  const next = mergeCompanionProfiles(profile);
  const added = Boolean(id) && !alreadyOwned && !next.companionIds.includes(id);
  if (id && !next.companionIds.includes(id)) next.companionIds.push(id);
  if (added) next.pendingCompanionIds.push(id);
  return { profile: next, added };
}

export function pendingCompanionIntro(profile, available) {
  return available.find((entry) => profile.pendingCompanionIds.includes(entry.id)
    && !profile.introducedCompanionIds.includes(entry.id));
}
