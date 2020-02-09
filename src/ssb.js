"use strict";

const flume = require("flumedb");
const obv = require("obv");
const pull = require("pull-stream");

let createFakeFilename;

try {
  createFakeFilename = () => {
    const result = "/tmp/oasis/log.flumeproxy";
    console.log(`saving view to file ${result}`);
    return result;
  };
} catch (e) {
  // We're probably running in a browser.
  createFakeFilename = () => null;
}

const flumeProxy = remote => {
  // Create local instance of flumedb that depends on the remote log.
  // Views will be created locally but the log will remain remote.
  const since = obv();

  console.log("starting since stream");
  pull(
    remote.createSequenceStream(),
    pull.drain(value => {
      console.log({ since: value });
      since.set(value);
    })
  );

  const proxy = flume({
    stream: (opts, cb) => remote.createLogStream({ raw: true, ...opts }, cb),
    since,
    get: (seq, cb) => remote.get({ id: seq }, cb),
    filename: createFakeFilename()
  });

  const _use = proxy.use;

  let pending = 0;
  let onReadyCb = null;

  // Match _flumeUse() API from ssb-db
  proxy._flumeUse = (name, createView) => {
    pending += 1;
    _use(name, createView);

    proxy.views[name].ready(() => {
      console.log(`${name} ready`);
      pending -= 1;
      if (pending === 0 && onReadyCb != null) {
        onReadyCb();
        onReadyCb = null;
      }
    });

    return proxy.views[name];
  };

  setInterval(() => {
    Object.entries(proxy.views).forEach(([key, value]) => {
      console.log(
        key,
        `${Math.round((value.since.value / since.value) * 100)}%`
      );
    });
  }, 1000);

  proxy.onReady = cb => {
    onReadyCb = cb;
  };

  return proxy;
};

const magic = ssb => {
  console.log("magic started");
  // Use the remote log to create a `use()` function that makes local views.
  // This means you can create views from ssb-client, not just the server config!
  const localFlume = flumeProxy(ssb);
  const _close = ssb.close;

  ssb._flumeUse = localFlume._flumeUse;
  ssb.close = () => {
    console.log("api.close() called");
    localFlume.close(() => {}); // MAGIC NO-OP
    _close();
  };

  const self = {
    use: plugin => {
      console.log(`installing ${plugin.name}`);
      if (typeof plugin.init === "function") {
        ssb[plugin.name] = plugin.init(ssb, {});
      }
      return self;
    },
    onReady: localFlume.onReady
  };

  return self;
};

// This module exports a function that connects to SSB and returns a "cooler"
// interface. This interface is poorly defined and should be replaced with
// native support for Promises in the MuxRPC module.

const ssbClient = require("ssb-client");
const ssbConfig = require("ssb-config");
const flotilla = require("@fraction/flotilla");
const debug = require("debug")("oasis");

const server = flotilla(ssbConfig);

const log = (...args) => {
  const isDebugEnabled = debug.enabled;
  debug.enabled = true;
  debug(...args);
  debug.enabled = isDebugEnabled;
};

const rawConnect = () =>
  new Promise((resolve, reject) => {
    ssbClient((err, api) => {
      if (err) {
        reject(err);
      } else {
        magic(api)
          .use(require("ssb-backlinks"))
          .use(require("ssb-about"))
          // .use(require('ssb-friends')) depends on weird hook that doesn't work over muxrpc
          .use(require("ssb-logging"))
          .use(require("ssb-query"))
          .use(require("ssb-search"))
          .use(require("ssb-tangle"));

        resolve(api);
      }
    });
  });

let handle;

const createConnection = config => {
  handle = new Promise(resolve => {
    rawConnect()
      .then(ssb => {
        log("Using pre-existing Scuttlebutt server instead of starting one");
        resolve(ssb);
      })
      .catch(() => {
        log("Initial connection attempt failed");
        log("Starting Scuttlebutt server");
        server(config);
        const connectOrRetry = () => {
          rawConnect()
            .then(ssb => {
              log("Retrying connection to own server");
              resolve(ssb);
            })
            .catch(e => {
              log(e);
              connectOrRetry();
            });
        };

        connectOrRetry();
      });
  });

  return handle;
};

module.exports = ({ offline }) => {
  if (offline) {
    log("Offline mode activated - not connecting to scuttlebutt peers or pubs");
    log(
      "WARNING: offline mode cannot control the behavior of pre-existing servers"
    );
  }

  const config = {
    conn: {
      autostart: !offline
    },
    ws: {
      http: false
    }
  };

  createConnection(config);
  return {
    connect() {
      // This has interesting behavior that may be unexpected.
      //
      // If `handle` is already an active [non-closed] connection, return that.
      //
      // If the connection is closed, we need to restart it. It's important to
      // note that if we're depending on an external service (like Patchwork) and
      // that app is closed, then Oasis will seamlessly start its own SSB service.
      return new Promise(resolve => {
        handle.then(ssb => {
          if (ssb.closed) {
            createConnection();
          }
          resolve(handle);
        });
      });
    },
    /**
     * @param {function} method
     */
    get(method, ...opts) {
      return new Promise((resolve, reject) => {
        method(...opts, (err, val) => {
          if (err) {
            reject(err);
          } else {
            resolve(val);
          }
        });
      });
    },
    read(method, ...args) {
      return new Promise(resolve => {
        resolve(method(...args));
      });
    }
  };
};
