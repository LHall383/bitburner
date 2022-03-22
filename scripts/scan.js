/** @param {NS} ns */
export async function main(ns) {
  const depth = 15;

  // seed server list
  let serverList = [];
  serverList.push(["home"]);
  serverList.push(ns.scan("home"));

  // iteratively list more deeply connected servers
  for (let i = 1; i < depth; i++) {
    let startList = serverList[i];
    let connectedList = [];

    // for each name at this level add the connected servers to the next level
    for (let name of startList) {
      let scanList = ns.scan(name);
      // verify servers and add
      for (let scannedName of scanList) {
        // dont add previously included servers
        if (
          scannedName == "home" ||
          connectedList.includes(scannedName) ||
          serverList[i - 1].includes(scannedName)
        ) {
          continue;
        }
        connectedList.push(scannedName);
      }
    }

    ns.tprint(connectedList);
    serverList.push(connectedList);
  }

  // flatten server list into normal array
  let flattened = serverList.slice(1).join();
  ns.tprint(JSON.stringify(flattened));

  // output server list to file
  ns.tprint(serverList);
  await ns.write("/data/server-list.txt", JSON.stringify(serverList), "w");
  await ns.write("/data/flattened-list.txt", JSON.stringify(flattened), "w");
}
