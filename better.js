const cooler = require("./src/ssb")({});
const pull = require("pull-stream");

// A map (like an object) where the values are sets (like arrays).
//
// If you convert the map to an object and sets to arrays, it'd look like:
//
//     { "a": [0, 1, 2], "b": [3, 4, 5] }
//
// For example, in `messagesByType` the map keys are message keys and the set
// is a list of message keys that have that type.
class MapSet extends Map {
  add(key, item) {
    if (this.has(key) === false) {
      this.set(key, new Set());
    }

    return this.get(key).add(item);
  }
}

const messagesByType = new MapSet();
const messagesByAuthor = new MapSet();
const latestSeqByAuthor = new Map();
const rootsReferencedByAuthor = new MapSet();
const nameByAuthor = new Map();
const imageByAuthor = new Map();
const descriptionByAuthor = new Map();
const notificationsForAuthor = new MapSet(); // only for me
const messagesBySubstring = new MapSet();

const isVisible = (messageValueContent) =>
  typeof messageValueContent === "object";

// Connect to the SSB service and start the stream.
cooler.open().then((ssb) => {
  // This function runs on every message, and populates the indexes. This seems
  // to be super fast, and my computer (2015 Chromebook Pixel) can process 1
  // million messages in ~55 seconds.
  const onEach = (message) => {
    const { key } = message;
    const { author, seq } = message.value;

    messagesByAuthor.add(author, key);
    latestSeqByAuthor.set(author, seq);

    if (isVisible(message.value.content)) {
      const { type } = message.value.content;

      messagesByType.add(type, key);

      switch (type) {
        case "about": {
          const { name, description, image, about } = message.value.content;
          if (about != null && about === author) {
            if (name != null) {
              nameByAuthor.set(author, name);
            }
            if (description != null) {
              descriptionByAuthor.set(author, description);
            }
            if (image != null) {
              imageByAuthor.set(author, image);
            }
          }
          break;
        }
        case "post": {
          const { root, mentions, text } = message.value.content;
          const isValidRoot = typeof root === "string";

          if (typeof text === "string" && text.length >= 3) {
            const words = text.match(/\w{3,}/g) || [];
            words.forEach((word) =>
              messagesBySubstring.add(word.toLowerCase(), key)
            );
          }

          // Only index conversations that I'm a part of.
          if (isValidRoot && author === ssb.id) {
            rootsReferencedByAuthor.add(author, root);
          }

          const mentionsMe =
            Array.isArray(mentions) &&
            mentions.map((x) => x.link).includes(ssb.id);

          if (mentionsMe) {
            notificationsForAuthor.add(ssb.id, key);
          } else {
            if (isValidRoot) {
              if (rootsReferencedByAuthor.has(ssb.id)) {
                if (rootsReferencedByAuthor.get(ssb.id).has(root)) {
                  notificationsForAuthor.add(ssb.id, key);
                }
              }
            }
          }

          break;
        }
      }
    }
  };

  // After the stream is finished, print some debugging information.
  const onDone = (err) => {
    if (err) throw err;

    console.log({
      name: nameByAuthor.get(ssb.id),
      description: descriptionByAuthor.get(ssb.id),
      image: imageByAuthor.get(ssb.id),
      notifications: notificationsForAuthor.get(ssb.id).size,
    });

    console.log(
      "Number of posts with the word pizza:",
      messagesBySubstring.get("pizza").size
    );

    const used = process.memoryUsage();
    for (let key in used) {
      console.log(
        `${key} ${Math.round((used[key] / 1024 / 1024) * 100) / 100} MB`
      );
    }

    // Run with:
    // - `node inspect better.js`
    // - Start with `c` (for "continue")
    // - Wait until the debugger hits our breakpoint
    // - Type `repl` and take a look at the indexes.
    debugger;

    ssb.close();
  };

  // Start the stream!
  pull(ssb.createLogStream(), pull.drain(onEach, onDone));
});
