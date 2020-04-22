const cooler = require("./src/ssb")({});
const pull = require("pull-stream");

const append = () => {
  const db = new Map();

  return {
    add: (key, item) => {
      if (db.has(key) === false) {
        db.set(key, new Set())
      }

      db.get(key).add(item)
    },
    get: (key) => {
      if (key == null) {
        return db;
      } else {
      if (db.has(key) === false) {
        db.set(key, new Set())
      }
        return db.get(key)
      }
    },
  };
};

const overwrite = () => {
  const database = {};

  return {
    set: (key, value) => {
      database[key] = value;
    },
    get: (key) => {
      if (key === undefined) {
        return database;
      } else {
        return database[key];
      }
    },
  };
};

const messagesByType = append();
const messagesByAuthor = append();
const latestSeqByAuthor = overwrite();
const latestAboutByAuthor = overwrite();
const rootsReferencedByAuthor = append();
const nameByAuthor = overwrite();
const imageByAuthor = overwrite();
const descriptionByAuthor = overwrite();
const notificationsForAuthor = append(); // only for me
const messagesBySubstring = append();

const isVisible = (messageValueContent) =>
  typeof messageValueContent === "object";

const main = async () => {
  const ssb = await cooler.open();

  const me = ssb.id;

  pull(
    ssb.createLogStream(),
    pull.drain(
      (message) => {
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

		    if (typeof text === "string" && text.length >= 2) {
			    const words = (text.match(/\w+/g) || []).filter(word => word.length >= 2)
			    words.forEach((word) => {
				    messagesBySubstring.add(word, key)
			    })
		    }

              if (isValidRoot) {
                rootsReferencedByAuthor.add(author, root);
              }

              const mentionsMe =
                Array.isArray(mentions) &&
                mentions.map((x) => x.link).includes(me);

              if (mentionsMe) {
                notificationsForAuthor.add(me, key);
              } else {
                if (isValidRoot) {
                  if (rootsReferencedByAuthor.get(me).has(root)) {
                    notificationsForAuthor.add(me, key);
                  }
                }
              }

              break;
            }
          }
        }
      },
      (err) => {
        if (err) throw err;

        console.log({
          name: nameByAuthor.get(me),
          description: descriptionByAuthor.get(me),
          image: imageByAuthor.get(me),
          notifications: notificationsForAuthor.get(me).size,
        });

	console.log('pizza posts:', messagesBySubstring.get('pizza').size)
        debugger;

        ssb.close();
      }
    )
  );
};

main();
