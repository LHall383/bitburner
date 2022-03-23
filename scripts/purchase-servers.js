/** @param {NS} ns */
export async function main(ns) {
  // parse command line args
  const args = ns.flags([
    ["target", "n00dles"],
    ["upgrade", false],
  ]);

  // some constants
  const ram = 4;
  const scriptName = "/scripts/basic-hack.js";
  const scriptRam = ns.getScriptRam(scriptName);

  // start with the number of current servers so we don't overbuy
  let servers = ns.getPurchasedServers();
  for (let i = servers.length; i < ns.getPurchasedServerLimit(); i++) {
    let server = "pserv-" + i;
    ns.print("Next server cost will be: " + ns.getPurchasedServerCost(ram));
    while (
      ns.getPurchasedServerCost(ram) > ns.getServerMoneyAvailable("home")
    ) {
      await ns.sleep(3000);
    }

    // make the purchase
    ns.purchaseServer(server, ram);

    // kill all currently running versions of the hack script
    ns.scriptKill(scriptName, server);

    // copy script to server
    await ns.scp(scriptName, server);

    // start maximum number of threads running script
    let ramAvailable = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
    let threads = Math.floor(ramAvailable / scriptRam);
    ns.exec(scriptName, server, threads, "--target", args["target"]);
    ns.print("Started " + threads + " threads of hack on server: " + server);
  }

  ns.print("Finished purchasing servers!");
  ns.toast("Finished purchasing servers!", "info", 5000);

  if (args["upgrade"]) {
    ns.spawn("/scripts/upgrade-servers.js", 1, "--target", args["target"]);
  }
}
