import { getStats } from "./modules/helper.js";

const weakenSecurityEffect = 0.05;
const growSecurityEffect = 0.004;
const hackSecurityEffect = 0.002;
const scheduleBufferTime = 500;
const executeBufferTime = 100;

function printServerStats(ns, server) {
  let stats = ns.getServer(server);

  let mp = (stats.moneyAvailable / stats.moneyMax) * 100;
  let money = stats.moneyAvailable;
  let maxMoney = stats.moneyMax;

  let sp = (stats.hackDifficulty / stats.minDifficulty) * 100;
  let sec = stats.hackDifficulty;
  let minSec = stats.minDifficulty;

  ns.print(` Stats for ${server}:`);
  ns.print(
    `   Money:    ${mp.toFixed(2)}% - ${money.toFixed(2)} / ${maxMoney}`
  );
  ns.print(`   Security: ${sp.toFixed(2)}% - ${sec.toFixed(2)} / ${minSec}`);
}

async function sleepUntil(ns, timeMS, useAsleep = false) {
  const sleepTime = Math.floor(timeMS - Date.now());
  if (sleepTime > 0) {
    ns.print(`Sleeping ${sleepTime} until ${new Date(timeMS).toISOString()}`);
    useAsleep ? await ns.alseep(sleepTime) : await ns.sleep(sleepTime);
  }
}

async function growToMaxMoney(ns, target, hosts, ramBudget, scripts) {
  let stats = getStats(ns, true, [target, ...hosts]);
  ns.print(`Growing ${target} to maximum money`);
  while (
    stats.servers[target].moneyAvailable < stats.servers[target].moneyMax
  ) {
    printServerStats(ns, target);
    const hostsInfo = hosts.map((s) => {
      const ramAvail =
        (stats.servers[s].maxRam - stats.servers[s].ramUsed) * ramBudget;
      return {
        hostname: s,
        ramAvail: ramAvail,
        wThreads: Math.floor(ramAvail / scripts.weakenScript.ram),
        gThreads: Math.floor(ramAvail / scripts.growScript.ram),
      };
    });
    const ramTotal = hostsInfo.reduce((a, b) => a.ramAvail + b.ramAvail);
    const wThreadsTotal = hostsInfo.reduce((a, b) => a.wThreads + b.wThreads);
    const gThreadsTotal = hostsInfo.reduce((a, b) => a.gThreads + b.gThreads);
    ns.print(`Will use ${ramTotal}GB across ${hosts.length} hosts.`);
    ns.print(`wThreads: ${wThreadsTotal}, gThreads ${gThreadsTotal}`);

    // if weaken will have full effect or security is too high
    if (
      stats.servers[target].hackDifficulty /
        stats.servers[target].minDifficulty >
        1.5 ||
      stats.servers[target].hackDifficulty -
        weakenSecurityEffect * wThreadsTotal >
        stats.servers[target].minDifficulty
    ) {
      let wTime = ns.formulas.hacking.weakenTime(
        stats.servers[target],
        stats.player
      );
      hostsInfo.forEach((host) => {
        ns.exec(
          scripts.weakenScript.name,
          host.hostname,
          host.wThreads,
          "--target",
          target
        );
      });
      ns.print(
        `Weakening server to drop security by ${
          weakenSecurityEffect * wThreadsTotal
        }`
      );

      ns.print(
        `Sleeping ${Math.ceil(
          wTime + scheduleBufferTime
        )}ms until weaken is finished`
      );
      await ns.sleep(Math.ceil(wTime + scheduleBufferTime));
    } else {
      // otherwise, continue to grow
      let gTime = ns.formulas.hacking.growTime(
        stats.servers[target],
        stats.player
      );
      hostsInfo.forEach((host) => {
        ns.exec(
          scripts.growScript.name,
          host.hostname,
          host.gThreads,
          "--target",
          target
        );
      });
      ns.print(`Growing server with ${gThreadsTotal} threads`);

      ns.print(
        `Sleeping ${Math.ceil(
          gTime + scheduleBufferTime
        )}ms until grow is finished`
      );
      await ns.sleep(Math.ceil(gTime + scheduleBufferTime));
    }

    stats = getStats(ns, true, [target, ...hosts]);
  }
  ns.print("-----Target at maximum money-----");
  printServerStats(ns, target);
}

async function reduceToMinSecurity(ns, target, hosts, ramBudget, scripts) {
  ns.print(`Reducing ${target} to minimum security`);
  let stats = getStats(ns, true, [target, ...hosts]);

  while (
    stats.servers[target].hackDifficulty > stats.servers[target].minDifficulty
  ) {
    printServerStats(ns, target);
    const hostsInfo = hosts.map((s) => {
      const ramAvail =
        (stats.servers[s].maxRam - stats.servers[s].ramUsed) * ramBudget;
      return {
        hostname: s,
        ramAvail: ramAvail,
        wThreads: Math.floor(ramAvail / scripts.weakenScript.ram),
      };
    });
    const wThreadsTotal = hostsInfo.reduce((a, b) => a.wThreads + b.wThreads);

    let wTime = ns.formulas.hacking.weakenTime(
      stats.servers[target],
      stats.player
    );
    hostsInfo.forEach((host) => {
      ns.exec(
        scripts.weakenScript.name,
        host.hostname,
        host.wThreads,
        "--target",
        target
      );
    });
    ns.print(
      `Weakening server to drop security by ${
        weakenSecurityEffect * wThreadsTotal
      }`
    );

    ns.print(
      `Sleeping ${Math.ceil(
        wTime + scheduleBufferTime
      )}ms until weaken is finished`
    );
    await ns.sleep(Math.ceil(wTime + scheduleBufferTime));

    stats = getStats(ns, true, [target, ...hosts]);
  }
  ns.print("-----Target at minimum security-----");
  printServerStats(ns, target);
}

/** @param {import("../.").NS} ns */
export async function main(ns) {
  let args = ns.flags([
    ["target", "joesguns"],
    ["ramBudget", 0.8],
    ["loop", false],
    ["hosts", ["pserv-0", "pserv-1"]],
  ]);

  let stats = getStats(ns, true, [args["target"], ...args["hosts"]]);

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
  const scripts = { hackScript, growScript, weakenScript };
  ns.print("Copying scripts to hosts");
  for (const host of args["hosts"]) {
    await ns.scp(
      [hackScript.name, growScript.name, weakenScript.name],
      "home",
      host
    );
  }

  // grow target to max money (while keeping security low)
  await growToMaxMoney(
    ns,
    args["target"],
    args["hosts"],
    args["ramBudget"],
    scripts
  );

  // reduce target to minimum security level
  await reduceToMinSecurity(
    ns,
    args["target"],
    args["hosts"],
    args["ramBudget"],
    scripts
  );

  // HWGW cycle
  do {
    // update stats
    stats = getStats(ns, true, [args["target"], ...args["hosts"]]);

    // if money is not at max, grow it here and notify
    if (
      stats.servers[args["target"]].moneyAvailable <
      stats.servers[args["target"]].moneyMax
    ) {
      ns.print("-----TARGET NOT AT MAX MONEY AFTER HWGW CYCLE-----");
      await growToMaxMoney(
        ns,
        args["target"],
        args["hosts"],
        args["ramBudget"],
        scripts
      );
    }

    // if security is not at minimum, drop it here and notify
    if (
      stats.servers[args["target"]].hackDifficulty >
      stats.servers[args["target"]].minDifficulty
    ) {
      ns.print("-----TARGET NOT AT MIN SECURITY AFTER HWGW CYCLE-----");
      await reduceToMinSecurity(
        ns,
        args["target"],
        args["hosts"],
        args["ramBudget"],
        scripts
      );
    }

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
