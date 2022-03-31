/** @param {import("../../.").NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["loop", false],
    ["id", ""],
  ]);
  do {
    await ns.share();
  } while (args["loop"]);
}
