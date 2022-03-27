/** @param {NS} ns */
export async function main(ns) {
  // parse command line args
  const args = ns.flags([
    ["target", "n00dles"],
    ["loop", false],
  ]);

  // continuously deploy hack script as we acquire new port cracking programs
  ns.exec("scripts/continuous-deploy.js", "home", 1, "--target", "n00dles");
  ns.print("Launched continuous-deploy");
  await ns.sleep(1000);

  // purchase private servers when we have the money, upgrade them after all are purchased
  ns.exec(
    "scripts/purchase-servers.js",
    "home",
    1,
    "--target",
    "n00dles",
    "--upgrade"
  );
  ns.print("Launched purchase-servers");
  await ns.sleep(1000);

  // main loop
  do {
    // TODO: use pservs for hack daemon rather than basic hack
    // run daemons/hack-daemon.js --target joesguns --loop --ramBudget 0.80 --hosts pserv-0 pserv-1

    await ns.sleep(1000);
  } while (args["loop"]);
}
