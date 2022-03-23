/** @param {NS} ns */
export async function main(ns) {
  // parse command line args
  const args = ns.flags([
    ["target", "n00dles"],
    ["loop", false],
  ]);

  ns.exec("scripts/continuous-deploy.js", "home", 1, "--target", "n00dles");
  ns.print("Launched continuous-deploy");

  ns.exec(
    "scripts/purchase-servers.js",
    "home",
    1,
    "--target",
    "n00dles",
    "--upgrade"
  );
  ns.print("Launched purchase-servers");

  // const serverLimit = ns.getPurchasedServerLimit();
  // const maxServerRam = ns.getPurchasedServerMaxRam();

  // let hasUpgraded = false;
  do {
    // check if we need to upgrade servers
    // if (!hasUpgraded) {
    //   let servers = ns.getPurchasedServers();
    //   if (
    //     servers.length >= serverLimit &&
    //     ns.getServerMaxRam(servers[servers.length - 1]) < maxServerRam
    //   ) {
    //     ns.exec("scripts/upgrade-servers.js", "home", 1, "--target", "n00dles");
    //     ns.print("Launched upgrade-servers");
    //     hasUpgraded = true;
    //   }
    // }

    await ns.sleep(1000);
  } while (args["loop"]);
}
