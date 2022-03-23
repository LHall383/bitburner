/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["target", "n00dles"],
    ["loop", false],
  ]);
  do {
    await ns.hack(args["target"]);
  } while (args["loop"]);
}
