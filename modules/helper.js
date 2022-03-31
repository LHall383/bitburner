/** @param {import("../.").NS} ns */
export async function connectToSever(
  ns,
  end,
  start = "home",
  convertToCommand = true
) {
  let stack = [[start]];
  let path = [];

  while (stack.length > 0) {
    path = stack.pop();
    // ns.tprint(path);

    let end_node = path[path.length - 1];
    // ns.tprint(end_node);
    if (end_node == end) {
      break;
    }

    let scan = ns.scan(end_node);
    // ns.tprint(scan);
    scan.forEach((x) => {
      if (path.includes(x)) {
        return;
      }

      let extendedPath = _.cloneDeep(path);
      extendedPath.push(x);
      // ns.tprint(extendedPath);
      stack.push(extendedPath);
    });

    await ns.sleep(1);
  }

  if (convertToCommand) {
    let command = "home; ";
    path.slice(1).forEach((x) => (command += `connect ${x}; `));
    return command;
  }

  return path;
}

/** @param {import("../.").NS} ns */
export function getStats(ns, player = true, servers = []) {
  const stats = { player: undefined, servers: {} };
  if (player) {
    stats.player = ns.getPlayer();
  }
  servers.forEach((s) => {
    if (ns.serverExists(s)) stats.servers[s] = ns.getServer(s);
  });
  return stats;
}
