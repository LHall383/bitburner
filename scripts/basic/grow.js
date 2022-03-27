/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["target", "n00dles"],
    ["loop", false],
    ["id", ""],
  ]);
  do {
    await ns.grow(args["target"]);
  } while (args["loop"]);
}
