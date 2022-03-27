/** @param {NS} ns */
export async function main(ns) {
  // parse command line args
  const args = ns.flags([
    ["target", "n00dles"],
    ["minRam", 4],
    ["maxRam", ns.getPurchasedServerMaxRam()],
    ["budget", 0.8],
  ]);

  // some constants
  const scriptName = "/scripts/basic-hack.js";
  const scriptRam = ns.getScriptRam(scriptName);

  // loop through with increasing amounts of ram
  for (let ram = args["minRam"]; ram <= args["maxRam"]; ram *= 2) {
    let threads = Math.floor(ram / scriptRam);
    let cost = ns.getPurchasedServerCost(ram);
    ns.print(`Upgrading to ${ram} ram. Running ${threads} threads.`);

    // loop through purchased servers and upgrade them to the provided amount of ram
    let servers = ns.getPurchasedServers();
    for (let i = 0; i < servers.length; i++) {
      let s = servers[i];

      // if already at current ram level, skip
      let sRam = ns.getServerMaxRam(s);
      if (sRam >= ram) continue;

      // wait for the money
      while (ns.getServerMoneyAvailable("home") * args["budget"] <= cost) {
        ns.printf(
          "Waiting for money to upgrade '%s'. Will spend $%s at $%s",
          s,
          cost.toLocaleString("en-US"),
          (cost / args["budget"]).toLocaleString("en-US")
        );
        await ns.sleep(10000);
      }

      // upgrade server
      ns.killall(s);
      ns.deleteServer(s);
      ns.purchaseServer(s, ram);

      // copy script to server
      await ns.scp(scriptName, s);

      // start maximum number of threads running script
      ns.exec(scriptName, s, threads, "--target", args["target"]);
      ns.print("Started " + threads + " threads of hack on server: " + s);
      ns.toast(`Upgraded ${s} to ${ram} RAM`, "info");
    }

    // wait to not freeze
    ns.print(`All servers up to ${ram} ram`);
    await ns.sleep(1);
  }

  ns.print("Finished upgrading servers!");
  ns.toast("Finished upgrading servers!", "info", 5000);
  let p1Handle = ns.getPortHandle(1);
  p1Handle.tryWrite(
    JSON.stringify({
      source: "upgrade-servers",
      exiting: true,
      message: `upgrade-servers exiting`,
    })
  );
}
