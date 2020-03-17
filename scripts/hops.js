const ssbClient = require("ssb-client");
const pull = require("pull-stream");

const maxHops = 3;

const done = [];

ssbClient().then(api => {
  api.friends.hops().then(hops => {
    pull(
      api.conn.stagedPeers(),
      pull.drain(x => {
        x.filter(([address]) => done.includes(address) === false).forEach(
          ([address, data]) => {
            console.log(done.length);
            const key = data.key;
            const haveHops = typeof hops[key] === "number";
            const hopValue = haveHops ? hops[key] : Infinity;
            if (hopValue <= maxHops) {
              console.log(`${address}: ⏳`);
              done.push(address);
              api.conn
                .connect(address, data)
                .then(() => console.log(`${address}: 👍`))
                .catch(() => console.log(`${address}: 👎`));
            }
          }
        );
      })
    );
  });
});
