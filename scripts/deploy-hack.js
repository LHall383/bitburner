const basicHackScript = "/scripts/basic-hack.js";
const files = [
  "/scripts/basic/hack.js",
  "/scripts/basic/weaken.js",
  "/scripts/basic/grow.js",
];

/** @param {NS} ns */
export async function main(ns) {
  // parse command line args
  const args = ns.flags([
    ["target", "n00dles"],
    ["restart", false],
    ["basic", false],
  ]);

  // seed server list
  const serverList = JSON.parse(ns.read("/data/flattened-list.txt")).split(",");
  ns.print(serverList);

  // calc RAM used by script
  let scriptRam = ns.getScriptRam(basicHackScript);
  let simpleScriptRam = ns.getScriptRam(files[0]);

  // start scripts on each server in list
  for (const server of serverList) {
    // delay a bit each loop to not lock up
    await ns.sleep(1);

    // verify that server actually exists
    if (ns.serverExists(server) === false) {
      // ns.tprint("Not a valid server: " + server);
      continue;
    }

    // attempt to take control of the server
    let ports = 0;
    if (ns.fileExists("BruteSSH.exe")) {
      ns.brutessh(server);
      ports++;
    }
    if (ns.fileExists("FTPCrack.exe")) {
      ns.ftpcrack(server);
      ports++;
    }
    if (ns.fileExists("RelaySMTP.exe")) {
      ns.relaysmtp(server);
      ports++;
    }
    if (ns.fileExists("HTTPWorm.exe")) {
      ns.httpworm(server);
      ports++;
    }
    if (ns.fileExists("SQLInject.exe")) {
      ns.sqlinject(server);
      ports++;
    }
    if (ns.getServerNumPortsRequired(server) <= ports) {
      ns.nuke(server);
    }

    // if we don't have root access, exit here
    if (ns.hasRootAccess(server) === false) {
      ns.print("No root access on: " + server);
      continue;
    }

    // kill all currently running versions of the hack script
    if (args["restart"]) {
      ns.printf("Restarting hacks on server: %s", server);
      ns.killall(server);
    }

    // copy script to server
    await ns.scp(basicHackScript, server);
    await ns.scp(files[0], server);
    await ns.scp(files[1], server);
    await ns.scp(files[2], server);

    if (args["basic"]) {
      // start threads for each simple script
      let ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
      let threads = ram / simpleScriptRam;
      let threadsH = Math.floor(threads * 0.1);
      let threadsW = Math.floor(threads * 0.53);
      let threadsG = Math.floor(threads * 0.37);
      ns.print(
        `Starting basic hack threads ${threadsH}H, ${threadsW}W, ${threadsG}G`
      );
      if (threadsH > 0) {
        ns.exec(files[0], server, threadsH, "--target", args["target"]);
      }
      if (threadsW > 0) {
        ns.exec(files[1], server, threadsW, "--target", args["target"]);
      }
      if (threadsG > 0) {
        ns.exec(files[2], server, threadsG, "--target", args["target"]);
      }
    } else {
      // start maximum number of threads running script
      let ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
      let threads = Math.floor(ram / scriptRam);
      if (threads > 0) {
        ns.exec(basicHackScript, server, threads, "--target", args["target"]);
        ns.printf("Started %i threads of hack on server: %s", threads, server);
      } else {
        ns.printf("Not enough ram for a thread on server: %s", server);
      }
    }
  }
}
