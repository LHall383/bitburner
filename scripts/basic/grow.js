/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([["target", "n00dles"]]);
  while (true) await ns.grow(args["target"]);
}
