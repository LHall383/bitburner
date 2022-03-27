/** @param {NS} ns */
export async function main(ns) {
  // parse command line args
  const args = ns.flags([["target", "n00dles"]]);

  const scriptName = "scripts/deploy-hack.js";
  ns.exec(scriptName, "home", 1, "--target", args["target"]);

  let lastPortLimit = 0;
  while (lastPortLimit < 5) {
    let portLimit = 0;

    if (ns.fileExists("BruteSSH.exe")) {
      portLimit++;
    }
    if (ns.fileExists("FTPCrack.exe")) {
      portLimit++;
    }
    if (ns.fileExists("RelaySMTP.exe")) {
      portLimit++;
    }
    if (ns.fileExists("HTTPWorm.exe")) {
      portLimit++;
    }
    if (ns.fileExists("SQLInject.exe")) {
      portLimit++;
    }

    if (portLimit > lastPortLimit) {
      let p1Handle = ns.getPortHandle(1);
      p1Handle.tryWrite(
        JSON.stringify({
          source: "continuous-deploy",
          message: `continuous-deploy launching deploy hack with ${portLimit} ports open`,
        })
      );
      ns.exec(scriptName, "home", 1, "--target", args["target"]);
    }

    await ns.sleep(1000);
    lastPortLimit = portLimit;
  }

  ns.print("Port limit reached, no longer need to deploy");
  let p1Handle = ns.getPortHandle(1);
  p1Handle.tryWrite(
    JSON.stringify({
      source: "continuous-deploy",
      exiting: true,
      message: `continuous-deploy exiting`,
    })
  );
}
