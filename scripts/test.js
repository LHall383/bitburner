import { connectToSever } from "./modules/helper.js";
import { setJobs } from "./modules/corps.js";

/** @param {NS} ns */
export async function main(ns) {
  // let path = await connectToSever(ns, "I.I.I.I");
  // ns.tprint(path);

  // let ret = ns.corporation.getCorporation();
  // ns.tprint(ret);

  // ns.tprint(ns.corporation.hasUnlockUpgrade("Office API"));
  // ns.tprint(ns.corporation.hasUnlockUpgrade("Warehouse API"));

  // const divName = "Pill Chungus";
  // const jobCounts = {
  //   Operations: 57,
  //   Engineer: 15,
  //   Business: 10,
  //   Management: 6,
  //   "Research & Development": 1,
  //   Training: 1,
  // };

  // let result = await setJobs(ns, divName, jobCounts);
  // ns.tprint(result);

  // ns.corporation.bulkPurchase("Pill Chungus", "Aevum", "Robots", 1);

  let args = ns.flags([["target", "omega-net"]]);
  // ns.tprint(ns.args);
  // ns.tprint(typeof ns.args);
  // ns.tprint(args);

  // ns.tprint(args["restart"]);
  // ns.tprint(args["minRam"]);
  // ns.tprint(args["minRam"] ?? 4);

  // ns.exec("/scripts/basic/hack.js", "home", 1, "--target", args["target"]);
}
