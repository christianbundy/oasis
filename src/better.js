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
  delete(key, item) {
    if (this.has(key) === false) {
      this.set(key, new Set());
    }

    return this.get(key).delete(item);
  }
}

const nullImage = `&${"0".repeat(43)}=.sha256`;

class AuthorMap extends Map {
  getOrCreate (key) {
    if (this.has(key) === false) {
      this.set(key, new Map())
        .get(key)
        .set('key', key)
        .set('blocking', new Set())
        .set('description', "")
        .set('following', new Set())
        .set('image', nullImage)
        .set('latestSeq', new Set())
        .set('messages', new Set())
        .set('name', key)
        .set('notifications', new Set())
        .set('posts', new Set())
        .set('publicWebHosting', false)
        .set('rootsReferenced', new Set())
    }

    return this.get(key)
  }
}

class MessageMap extends Map {
  getOrCreate (key) {
    if (this.has(key) === false) {
      this.set(key, new Map())
        .get(key)
        .set('key', key)
        .set('value', null)
        .set('likes', new Set())
    }

    return this.get(key)
  }
}

const authors = new AuthorMap();
const messages = new MessageMap();

// Miscellaneous indexes
const messagesBySubstring = new MapSet();
const messagesByType = new MapSet();

const isVisible = (messageValueContent) =>
  typeof messageValueContent === "object";

// Connect to the SSB service and start the stream.
module.exports = (cooler) => {
  cooler.open().then((ssb) => {
    // This function runs on every message, and populates the indexes. This seems
    // to be super fast, and my computer (2015 Chromebook Pixel) can process 1
    // million messages in ~55 seconds.
    const onEach = (message) => {
      const { key } = message;

      // Add message to `messages` store. This sets the value and the empty set
      // of other messages that have liked it.
      const thisMessage = messages
        .set(key, new Map())
        .get(key)

      thisMessage
        .set('value', message.value)
        .set('likes', new Set())

      const { author, seq } = message.value

      const thisAuthor = authors.getOrCreate(author);

      thisAuthor
        .get('messages').add(thisMessage)

      thisAuthor
        .set('latestSeq', seq);

      if (isVisible(message.value.content)) {
        const { type } = message.value.content;

        messagesByType.add(type, thisMessage);

        switch (type) {
          case "vote": {
            const { vote } = message.value.content;
            if (typeof vote === "object") {
              const { value, link } = vote;
              if (typeof value === "number" && typeof link === "string") {
                if (value > 0) {
                  messages.getOrCreate(link).get('likes').add(thisAuthor);
                } else {
                  messages.getOrCreate(link).get('likes').delete(author);
                }
              }
            }
            break;
          }
          case "contact": {
            const { contact, following, blocking } = message.value.content;
            if (contact != null) {
              const contactAuthor = authors.getOrCreate(contact);
              if (following != null) {
                if (following) {
                  thisAuthor.get('following').add(contactAuthor);
                } else {
                  thisAuthor.get('following').delete(contactAuthor);
                }
              }
              if (blocking != null) {
                if (blocking) {
                  thisAuthor.get('blocking').add(contactAuthor);
                } else {
                  thisAuthor.get('blocking').delete(contactAuthor);
                }
              }
            }

            break;
          }
          case "about": {
            const {
              name,
              description,
              image,
              about,
              publicWebHosting,
            } = message.value.content;
            if (about != null && about === author) {
              if (name != null) {
                thisAuthor.set('name', name);
              }
              if (description != null) {
                thisAuthor.set('description', description);
              }
              if (image != null) {
                if (typeof image === "string") {
                  thisAuthor.set('image', image);
                } else if (typeof image.link === "string") {
                  thisAuthor.set('image', image.link);
                }
              }
              if (publicWebHosting != null) {
                thisAuthor.set('publicWebHosting', publicWebHosting);
              }
            }
            break;
          }
          case "post": {
            const { root, mentions, text } = message.value.content;
            const isValidRoot = typeof root === "string";
            thisAuthor.get('posts').add(thisMessage);

            if (typeof text === "string" && text.length >= 3) {
              const words = text.match(/\w{3,}/g) || [];
              words.forEach((word) =>
                messagesBySubstring.add(word.toLowerCase(), thisMessage)
              );
            }

            // Only index conversations that I'm a part of.
            if (isValidRoot && author === ssb.id) {
              thisAuthor.get('rootsReferenced').add(author, root);
            }

            const mentionsMe =
              Array.isArray(mentions) &&
              mentions.map((x) => x.link).includes(ssb.id);

            if (mentionsMe) {
              thisAuthor.get('notifications').add(thisMessage);
            } else {
              if (isValidRoot) {
                if (thisAuthor.get('rootsReferenced').has(root)) {
                    thisAuthor.get('notifications').add(thisMessage);
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

      const me = authors.get(ssb.id);

      const notifications = me.get('notifications');

      console.log({
        name: me.get('name'),
        description: me.get('description'),
        image: me.get('image'),
        notifications: notifications ? notifications.size : 0,
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

      // ssb.close();
    };

    // Start the stream!
    pull(ssb.createLogStream(), pull.drain(onEach, onDone));
  });

  const tailSize = 64;
  const reverseTail = (set) => Array.from(set).slice(set.size - tailSize).reverse()
  const serializeMessage = (messageMap) => ({
    key: messageMap.get('key'),
    value: messageMap.get('value')
  })

  const api = {
    getName: (feedId) => authors.getOrCreate(feedId).get('name'),
    getImage: (feedId) => authors.getOrCreate(feedId).get('image'),
    getDescription: (feedId) => authors.getOrCreate(feedId).get('description'),
    getPublicWebHosting: (feedId) => authors.getOrCreate(feedId).get('publicWebHosting'),
    getNotifications: (feedId) => {
      const notifications = authors.getOrCreate(feedId).get('notifications');
      return reverseTail(notifications).map(serializeMessage);
    },
    getLikes: (messageId) => Array.from(messages.getOrCreate(messageId).get('likes')).map((authorMap) => authorMap.get('key')),
    getRelationship: ({ source, dest }) => {
      const sourceAuthor = authors.getOrCreate(source);

      return {
        following: sourceAuthor.get('following').has(dest),
        blocking: sourceAuthor.get('blocking').has(dest),
      }
    },
    getMessage: (key) => {
      const targetMessage = messages.getOrCreate(key);

      const value = targetMessage.get('value')

      if (value === null) {
        console.log('Missing:', key);
        return null;
      } else {
        return {
          key,
          value
        }
      }
    },
    getPostsByAuthor: (feedId) => {
      const posts = authors.getOrCreate(feedId).get('posts')
      return reverseTail(posts).map(serializeMessage);
    },
  };

  return api;
};
