function printServerStats(ns, server) {
  let money = ns.getServerMoneyAvailable(server);
  let maxMoney = ns.getServerMaxMoney(server);
  let security = ns.getServerSecurityLevel(server);
  let securityMin = ns.getServerMinSecurityLevel(server);

  ns.print(` Stats for ${server}:`);
  ns.print(
    `   Money:    ${(money / maxMoney) * 100}% - ${money} / ${maxMoney}`
  );
  ns.print(
    `   Security: ${
      (security / securityMin) * 100
    }% - ${security} / ${securityMin}`
  );
}

/** @param {NS} ns */
export async function main(ns) {
  let args = ns.flags([
    ["target", "joesguns"],
    ["ramBudget", 0.8],
    ["loop", false],
    ["host", "home"],
  ]);
  const delayTime = 100;
  const weakenSecurityEffect = 0.05;
  const growSecurityEffect = 0.004;
  const hackSecurityEffect = 0.002;
  const minSec = ns.getServerMinSecurityLevel(args["target"]);

  const hackScript = {
    name: "/scripts/basic/hack.js",
    ram: ns.getScriptRam("/scripts/basic/hack.js", args["host"]),
  };
  const growScript = {
    name: "/scripts/basic/grow.js",
    ram: ns.getScriptRam("/scripts/basic/grow.js", args["host"]),
  };
  const weakenScript = {
    name: "/scripts/basic/weaken.js",
    ram: ns.getScriptRam("/scripts/basic/weaken.js", args["host"]),
  };
  const scripts = [hackScript, growScript, weakenScript];
  await ns.scp(
    scripts.map((s) => s.name),
    "home",
    args["host"]
  );

  // grow target to max money (while keeping security low)
  while (
    ns.getServerMoneyAvailable(args["target"]) <
    ns.getServerMaxMoney(args["target"])
  ) {
    let ramToUse =
      (ns.getServerMaxRam(args["host"]) - ns.getServerUsedRam(args["host"])) *
      args["ramBudget"];
    let wThreads = Math.floor(ramToUse / weakenScript.ram);
    let gThreads = Math.floor(ramToUse / growScript.ram);

    if (
      ns.getServerSecurityLevel(args["target"]) -
        weakenSecurityEffect * wThreads >
      minSec
    ) {
      let wTime = ns.formulas.hacking.weakenTime(
        ns.getServer(args["target"]),
        ns.getPlayer()
      );
      ns.exec(
        weakenScript.name,
        args["host"],
        wThreads,
        "--target",
        args["target"]
      );
      await ns.sleep(Math.ceil(wTime + delayTime));
    } else {
      let gTime = ns.formulas.hacking.growTime(
        ns.getServer(args["target"]),
        ns.getPlayer()
      );
      ns.exec(
        growScript.name,
        args["host"],
        gThreads,
        "--target",
        args["target"]
      );
      await ns.sleep(Math.ceil(gTime + delayTime));
    }
  }

  // reduce target to minimum security level
  while (ns.getServerSecurityLevel(args["target"]) > minSec) {
    let ramToUse =
      (ns.getServerMaxRam(args["host"]) - ns.getServerUsedRam(args["host"])) *
      args["ramBudget"];
    let threadsToUse = Math.floor(ramToUse / weakenScript.ram);
    let weakenTime = ns.formulas.hacking.weakenTime(
      ns.getServer(args["target"]),
      ns.getPlayer()
    );

    ns.exec(
      weakenScript.name,
      args["host"],
      threadsToUse,
      "--target",
      args["target"]
    );
    await ns.sleep(Math.ceil(weakenTime + delayTime));
  }

  // hack-grow-weaken cycle
  do {
    printServerStats(ns, args["target"]);
    let ramToUse =
      (ns.getServerMaxRam(args["host"]) - ns.getServerUsedRam(args["host"])) *
      args["ramBudget"];
    let threads = Math.floor(ramToUse / growScript.ram);
    let wThreads = Math.ceil(threads * 0.12);
    let hThreads = Math.floor((threads - wThreads) / 2);
    let gThreads = threads - wThreads - hThreads;
    ns.print(`G: ${gThreads}, H: ${hThreads}, W: ${wThreads}`);

    let hackTime = ns.formulas.hacking.hackTime(
      ns.getServer(args["target"]),
      ns.getPlayer()
    );
    let growTime = ns.formulas.hacking.growTime(
      ns.getServer(args["target"]),
      ns.getPlayer()
    );
    let weakenTime = ns.formulas.hacking.weakenTime(
      ns.getServer(args["target"]),
      ns.getPlayer()
    );

    ns.exec(
      hackScript.name,
      args["host"],
      hThreads,
      "--target",
      args["target"]
    );
    ns.exec(
      growScript.name,
      args["host"],
      gThreads,
      "--target",
      args["target"]
    );
    ns.exec(
      weakenScript.name,
      args["host"],
      wThreads,
      "--target",
      args["target"]
    );

    await ns.sleep(Math.ceil(hackTime + delayTime));
    printServerStats(ns, args["target"]);
    await ns.sleep(Math.ceil(growTime - hackTime + delayTime));
    printServerStats(ns, args["target"]);
    await ns.sleep(Math.ceil(weakenTime - growTime + delayTime));
    printServerStats(ns, args["target"]);
  } while (args["loop"]);
}
