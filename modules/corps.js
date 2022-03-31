const cities = [
  "Aevum",
  "Chongqing",
  "Sector-12",
  "New Tokyo",
  "Ishima",
  "Volhaven",
];

/** @param {import("../.").NS} ns */
export async function setJobs(ns, divName, jobCounts) {
  let success = true;

  if (!ns.corporation.hasUnlockUpgrade("Office API")) {
    return false;
  }

  for (const city of cities) {
    for (const job in jobCounts) {
      let res = await ns.corporation.setAutoJobAssignment(
        divName,
        city,
        job,
        0
      );
      ns.print(`${city}-${job}: ${res}`);
      if (res == false) success = false;
    }
    for (const job in jobCounts) {
      let res = await ns.corporation.setAutoJobAssignment(
        divName,
        city,
        job,
        jobCounts[job]
      );
      ns.print(`${city}-${job}: ${res}`);
      if (res == false) success = false;
    }
  }

  return success;
}
