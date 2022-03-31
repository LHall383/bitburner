import { getStats } from "./modules/helper.js";

let flags = {
  finishedDeploy: false,
  purchasedServers: false,
  launchedUpgrades: false,
  upgradedServers: false,
  launchedCorpDaemon: false,
};

function handleP1Message(ns, message) {
  // attempt to parse port message
  try {
    const parsed = JSON.parse(message);
    if (typeof parsed !== "object") {
      ns.print(message);
      return;
    }

    // handle parsed message object
    ns.print(`${parsed.source}: ${parsed.message}`);
    switch (parsed.source) {
      case "continuous-deploy":
        if (parsed.exiting) {
          flags.finishedDeploy = true;
        }
        break;
      case "purchase-servers":
        if (parsed.exiting) {
          flags.purchasedServers = true;
        }
        break;
      case "upgrade-servers":
        if (parsed.exiting) {
          flags.upgradedServers = true;
        }
        break;
      default:
        break;
    }
  } catch (e) {
    ns.print(message);
  }
}

/** @param {import("../.").NS} ns */
export async function main(ns) {
  // parse command line args
  const args = ns.flags([["loop", true]]);

  // we do our own logging
  ns.disableLog("ALL");
  ns.print("----------Staring main daemon----------");

  // continuously deploy hack script as we acquire new port cracking programs
  ns.exec("scripts/continuous-deploy.js", "home", 1, "--target", "n00dles");
  ns.print("Launched continuous-deploy");
  await ns.sleep(1000);

  // purchase private servers when we have the money
  ns.exec("scripts/purchase-servers.js", "home", 1, "--target", "n00dles");
  ns.print("Launched purchase-servers");
  await ns.sleep(1000);

  // main loop
  const p1Handle = ns.getPortHandle(1);
  let hackTargets = [
    "foodnstuff",
    "sigma-cosmetics",
    "joesguns",
    "hong-fang-tea",
    "harakiri-sushi",
    "iron-gym",
    "nectar-net",
    "syscore",
    "zer0",
    "max-hardware",
    "phantasy",
    "omega-net",
  ];
  let claimedServers = [];
  let stats = getStats(ns, true, [...hackTargets]);
  do {
    // update stats
    stats = getStats(ns, true, [...hackTargets]);

    // read port 1 for global updates
    if (p1Handle.peek() !== "NULL PORT DATA") {
      handleP1Message(ns, p1Handle.read());
    }

    // launch upgrades when servers are fully purchased
    if (flags.purchasedServers && !flags.launchedUpgrades) {
      flags.launchedUpgrades = true;
      let maxRam = 1024; // ns.getPurchasedServerMaxRam() / Math.pow(2, 10)
      ns.exec(
        "scripts/upgrade-servers.js",
        "home",
        1,
        "--target",
        "n00dles",
        "--maxRam",
        maxRam
      );
      ns.print("Launched purchase-servers");
      await ns.sleep(1000);
    }

    // use pservs for hack daemon rather than basic hack
    if (
      flags.purchasedServers &&
      flags.finishedDeploy &&
      flags.upgradedServers &&
      hackTargets.length > 0
    ) {
      const targetsStats = hackTargets.map((s) => stats.servers[s]);
      targetsStats.sort((a, b) => {
        a.requiredHackingSkill - b.requiredHackingSkill;
      });
      const t = targetsStats.shift();

      if (stats.player.hacking > t.requiredHackingSkill) {
        let host1 = `pserv-${claimedServers.length + 1}`;
        let host2 = `pserv-${claimedServers.length + 2}`;
        ns.killall(host1);
        ns.killall(host2);
        claimedServers.push(host1);
        claimedServers.push(host2);

        ns.exec(
          "daemons/hack-daemon.js",
          "home",
          1,
          "--target",
          t.hostname,
          "--loop",
          "--ramBudget",
          1.0,
          "--hosts",
          host1,
          "--hosts",
          host2
        );
        ns.print(
          `Launching hack-daemon targeting ${t.hostname}, hosted on ${host1} and ${host2}`
        );
        hackTargets.shift();
      }
    }

    // if we have a corporation, launch the corp-daemon to manage it
    if (stats.player.hasCorporation && !flags.launchedCorpDaemon) {
      ns.exec("daemons/corp-daemon.js", "home", 1, "--loop");
      flags.launchedCorpDaemon = true;
      ns.print("Launching corp-daemon");
    }

    // TODO: share pserv-0 if we aren't using it
    // scp scripts/basic/share.js pserv-0; connect pserv-0; killall; run scripts/basic/share.js -t 256 --loop; home

    await ns.sleep(100);
  } while (args["loop"]);
}
