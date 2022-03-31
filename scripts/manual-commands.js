import { connectToSever } from "./modules/helper.js";

/** @param {import("../.").NS} ns */
export async function main(ns) {
  ns.tprintf(
    "Purchase:      buy BruteSSH.exe; buy FTPCrack.exe; buy relaySMTP.exe; buy HTTPWorm.exe; buy SQLInject.exe; buy ServerProfiler.exe; buy DeepscanV1.exe; buy DeepscanV2.exe; buy AutoLink.exe; buy Formulas.exe; buy -l;"
  );

  let toCSEC = await connectToSever(ns, "CSEC");
  ns.tprintf("To CSEC:       %s backdoor;", toCSEC);

  let toNiteSec = await connectToSever(ns, "avmnite-02h");
  ns.tprintf("To NiteSec:    %s backdoor;", toNiteSec);

  let toBlackHand = await connectToSever(ns, "I.I.I.I");
  ns.tprintf("To Black Hand: %s backdoor;", toBlackHand);

  let toBitRunners = await connectToSever(ns, "run4theh111z");
  ns.tprintf("To Bitrunners: %s backdoor;", toBitRunners);

  let toTheCave = await connectToSever(ns, "The-Cave");
  ns.tprintf("To The Cave:   %s backdoor;", toTheCave);
}
