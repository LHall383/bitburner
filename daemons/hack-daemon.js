import { getStats } from "./modules/helper.js";

function printServerStats(ns, server) {
  let stats = ns.getServer(server);

  ns.print(` Stats for ${server}:`);
  ns.print(
    `   Money:    ${(stats.moneyAvailable / stats.moneyMax) * 100}% - ${
      stats.moneyAvailable
    } / ${stats.moneyMax}`
  );
  ns.print(
    `   Security: ${(stats.hackDifficulty / stats.minDifficulty) * 100}% - ${
      stats.hackDifficulty
    } / ${stats.minDifficulty}`
  );
}

async function sleepUntil(ns, timeMS, useAsleep = false) {
  const sleepTime = Math.floor(timeMS - Date.now());
  if (sleepTime > 0) {
    ns.print(`Sleeping ${sleepTime} until ${new Date(timeMS).toISOString()}`);
    useAsleep ? await ns.alseep(sleepTime) : await ns.sleep(sleepTime);
  }
}

/** @param {NS} ns */
export async function main(ns) {
  let args = ns.flags([
    ["target", "joesguns"],
    ["ramBudget", 0.8],
    ["loop", false],
    ["starterHost", undefined],
    ["hosts", ["pserv-0", "pserv-1"]],
  ]);
  const starterHost = args["starterHost"] ?? args["hosts"][0];

  const delayTime = 100;
  const weakenSecurityEffect = 0.05;
  const growSecurityEffect = 0.004;
  const hackSecurityEffect = 0.002;
  const scheduleBufferTime = 500;
  const executeBufferTime = 100;
  let stats = getStats(ns, true, [
    args["target"],
    starterHost,
    ...args["hosts"],
  ]);

  // we do our own logging
  ns.disableLog("ALL");
  ns.print("----------Staring hack-daemon----------");

  // copy scripts to hosts
  const hackScript = {
    name: "/scripts/basic/hack.js",
    ram: ns.getScriptRam("/scripts/basic/hack.js", "home"),
  };
  const growScript = {
    name: "/scripts/basic/grow.js",
    ram: ns.getScriptRam("/scripts/basic/grow.js", "home"),
  };
  const weakenScript = {
    name: "/scripts/basic/weaken.js",
    ram: ns.getScriptRam("/scripts/basic/weaken.js", "home"),
  };
  const scripts = [hackScript, growScript, weakenScript];
  ns.print("Copying scripts to hosts");
  await ns.scp(
    scripts.map((s) => s.name),
    "home",
    starterHost
  );
  for (const host of args["hosts"]) {
    await ns.scp(
      scripts.map((s) => s.name),
      "home",
      host
    );
  }

  // grow target to max money (while keeping security low)
  stats = getStats(ns, true, [args["target"], starterHost, ...args["hosts"]]);
  ns.print("Growing target to maximum money while keeping security low");
  while (
    stats.servers[args["target"]].moneyAvailable <
    stats.servers[args["target"]].moneyMax
  ) {
    printServerStats(ns, args["target"]);
    let ramToUse =
      (stats.servers[starterHost].maxRam - stats.servers[starterHost].ramUsed) *
      args["ramBudget"];
    let wThreads = Math.floor(ramToUse / weakenScript.ram);
    let gThreads = Math.floor(ramToUse / growScript.ram);
    ns.print(`Will use ${ramToUse}GB host ram.`);
    ns.print(`wThreads: ${wThreads}, gThreads ${gThreads}`);

    // if weaken will have full effect weaken, otherwise continue to grow server
    if (
      stats.servers[args["target"]].hackDifficulty -
        weakenSecurityEffect * wThreads >
      stats.servers[args["target"]].minDifficulty
    ) {
      let wTime = ns.formulas.hacking.weakenTime(
        stats.servers[args["target"]],
        stats.player
      );
      ns.exec(
        weakenScript.name,
        starterHost,
        wThreads,
        "--target",
        args["target"]
      );
      ns.print(
        `Weakening server to drop security by ${
          weakenSecurityEffect * wThreads
        }`
      );
      ns.print(
        `Sleeping ${Math.ceil(wTime + delayTime)}ms until weaken is finished`
      );
      await ns.sleep(Math.ceil(wTime + delayTime));
    } else {
      let gTime = ns.formulas.hacking.growTime(
        stats.servers[args["target"]],
        stats.player
      );
      ns.exec(
        growScript.name,
        starterHost,
        gThreads,
        "--target",
        args["target"]
      );
      ns.print(`Growing server with ${gThreads} threads`);
      ns.print(
        `Sleeping ${Math.ceil(gTime + delayTime)}ms until grow is finished`
      );
      await ns.sleep(Math.ceil(gTime + delayTime));
    }

    stats = getStats(ns, true, [args["target"], starterHost, ...args["hosts"]]);
  }
  ns.print("-----Target at maximum money-----");
  printServerStats(ns, args["target"]);

  // reduce target to minimum security level
  ns.print("Reducing target to minimum security");
  stats = getStats(ns, true, [args["target"], starterHost, ...args["hosts"]]);
  while (
    stats.servers[args["target"]].hackDifficulty >
    stats.servers[args["target"]].minDifficulty
  ) {
    let ramToUse =
      (stats.servers[starterHost].maxRam - stats.servers[starterHost].ramUsed) *
      args["ramBudget"];
    let wThreads = Math.floor(ramToUse / weakenScript.ram);
    let weakenTime = ns.formulas.hacking.weakenTime(
      stats.servers[args["target"]],
      stats.player
    );

    ns.exec(
      weakenScript.name,
      starterHost,
      wThreads,
      "--target",
      args["target"]
    );
    ns.print(
      `Weakening server with ${wThreads} threads to drop security by ${
        weakenSecurityEffect * wThreads
      }`
    );
    ns.print(
      `Sleeping ${Math.ceil(weakenTime + delayTime)}ms until weaken is finished`
    );
    await ns.sleep(Math.ceil(weakenTime + delayTime));

    stats = getStats(ns, true, [args["target"], starterHost, ...args["hosts"]]);
  }
  ns.print("-----Target at minimum security-----");
  printServerStats(ns, args["target"]);

  // HWGW cycle
  do {
    // update stats
    stats = getStats(ns, true, [args["target"], starterHost, ...args["hosts"]]);

    // find max ram chunk
    const hostsStats = args["hosts"].map((h) => stats.servers[h]);
    hostsStats.sort((a, b) => b.maxRam - b.ramUsed - (a.maxRam - a.ramUsed));
    const maxRamChunk = hostsStats[0].maxRam - hostsStats[0].ramUsed;
    ns.print(`Hosts: ${args["hosts"]}.`);
    ns.print(
      `${hostsStats[0].hostname} has most ram available: ${maxRamChunk}`
    );

    // calc grow effect for max ram
    const gThreads = Math.floor(maxRamChunk / growScript.ram);
    const gTime = ns.formulas.hacking.growTime(
      stats.servers[args["target"]],
      stats.player
    );
    const gPercent = ns.formulas.hacking.growPercent(
      stats.servers[args["target"]],
      gThreads,
      stats.player,
      1
    );

    // find threads to hack equal to grow
    const hPercent = 1 - 1 / gPercent;
    const hThreads = Math.floor(
      ns.hackAnalyzeThreads(
        stats.servers[args["target"]].hostname,
        stats.servers[args["target"]].moneyMax * hPercent
      )
    );
    const hTime = ns.formulas.hacking.hackTime(
      stats.servers[args["target"]],
      stats.player
    );

    // find threads of weaken to offset hack and grow
    const hOffsetThreads = Math.ceil(
      (hackSecurityEffect * hThreads) / weakenSecurityEffect
    );
    const gOffsetThreads = Math.ceil(
      (growSecurityEffect * gThreads) / weakenSecurityEffect
    );
    const wTime = ns.formulas.hacking.weakenTime(
      stats.servers[args["target"]],
      stats.player
    );

    // output stats about jobs
    ns.print(
      `HACK:    ${hThreads} threads, ${hTime.toFixed(2)}ms, ${(
        hPercent * 100
      ).toFixed(2)}% hacked`
    );
    ns.print(
      `WEAKEN1: ${hOffsetThreads} threads, ${wTime.toFixed(2)}ms, ${(
        hOffsetThreads * weakenSecurityEffect
      ).toFixed(2)} weakened`
    );
    ns.print(
      `GROW:    ${gThreads} threads, ${gTime.toFixed(2)}ms, ${(
        gPercent * 100
      ).toFixed(2)}% growth`
    );
    ns.print(
      `WEAKEN2: ${gOffsetThreads} threads, ${wTime.toFixed(2)}ms, ${(
        gOffsetThreads * weakenSecurityEffect
      ).toFixed(2)} weakened`
    );

    // schedule jobs
    let now = Date.now();
    const endHackTime =
      now + Math.max(hTime, wTime, gTime) + scheduleBufferTime;
    const startHackTime = endHackTime - hTime;
    const startWeaken1Time = endHackTime + executeBufferTime - wTime;
    const startGrowTime = endHackTime + executeBufferTime * 2 - gTime;
    const startWeaken2Time = endHackTime + executeBufferTime * 3 - wTime;
    const scheduledJobs = [
      {
        name: `hack ${stats.servers[args["target"]].hostname}`,
        scriptName: hackScript.name,
        startTime: startHackTime,
        duration: hTime,
        threads: hThreads,
        target: stats.servers[args["target"]].hostname,
        host: args["hosts"][1],
      },
      {
        name: `weaken1 ${stats.servers[args["target"]].hostname}`,
        scriptName: weakenScript.name,
        startTime: startWeaken1Time,
        duration: wTime,
        threads: hOffsetThreads,
        target: stats.servers[args["target"]].hostname,
        host: args["hosts"][1],
      },
      {
        name: `grow ${stats.servers[args["target"]].hostname}`,
        scriptName: growScript.name,
        startTime: startGrowTime,
        duration: gTime,
        threads: gThreads,
        target: stats.servers[args["target"]].hostname,
        host: args["hosts"][0],
      },
      {
        name: `weaken2 ${stats.servers[args["target"]].hostname}`,
        scriptName: weakenScript.name,
        startTime: startWeaken2Time,
        duration: wTime,
        threads: gOffsetThreads,
        target: stats.servers[args["target"]].hostname,
        host: args["hosts"][1],
      },
    ];

    // TODO: determine hosts for each job

    // dispatch jobs
    scheduledJobs.sort((a, b) => a.startTime - b.startTime);
    ns.print(
      scheduledJobs.map((j) => {
        j.endTime = new Date(j.startTime + j.duration).toISOString();
        return j;
      })
    );
    while (scheduledJobs.length > 0) {
      const job = scheduledJobs.shift();
      ns.print(`Handling job: ${job.name}`);

      // sleep until job start time
      await sleepUntil(ns, job.startTime);

      // execute job
      ns.print(`Executing job: ${job.name}`);
      ns.exec(
        job.scriptName,
        job.host,
        job.threads,
        "--target",
        job.target,
        "--id",
        `${job.name} ${new Date(job.startTime + job.duration).toISOString()}`
      );
    }

    // wait until jobs are finished, display stats
    await sleepUntil(ns, endHackTime);
    for (let i = 0; i < 5; i++) {
      await sleepUntil(ns, endHackTime + executeBufferTime * i);
      printServerStats(ns, stats.servers[args["target"]].hostname);
    }

    // padding with sleep, sometimes we go too quickly
    await ns.sleep(scheduleBufferTime);

    // TODO: calc how many targets we can effectively hack
  } while (args["loop"]);

  ns.print("----------End hack-daemon----------");
}
