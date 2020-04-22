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

// Indexes by message
const valuesByMessage = new Map();
const likesByMessage = new MapSet();

// Indexes by author
const blockingByAuthor = new MapSet();
const descriptionByAuthor = new Map();
const followingByAuthor = new MapSet();
const imageByAuthor = new Map();
const latestSeqByAuthor = new Map();
const messagesByAuthor = new MapSet();
const nameByAuthor = new Map();
const notificationsByAuthor = new MapSet(); // only for me
const publicWebHostingByAuthor = new Map();
const rootsReferencedByAuthor = new MapSet();

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

      valuesByMessage.set(key, message.value)
      const { author, seq } = message.value;

      messagesByAuthor.add(author, key);
      latestSeqByAuthor.set(author, seq);

      if (isVisible(message.value.content)) {
	const { type } = message.value.content;

	messagesByType.add(type, key);

	switch (type) {
	  case "vote": {
	    const { vote } = message.value.content;
	    if (typeof vote === 'object') {
	      const { value, link } = vote;
	      if (typeof value === 'number' && typeof link === 'string') {
		if (value > 0) {
		  likesByMessage.add(key, author)
		} else {
		  likesByMessage.delete(key, author)
		}
	      }
	    }
	    break;
	  }
	  case "contact": {
	    const { contact, following, blocking } = message.value.content;
	    if (contact != null) {
	      if (following) {
		followingByAuthor.add(author, contact);
	      }
	      if (blocking) {
		blockingByAuthor.add(author, contact);
	      }
	    }

	    break;
	  }
	  case "about": {
	    const { name, description, image, about, publicWebHosting } = message.value.content;
	    if (about != null && about === author) {
	      if (name != null) {
		nameByAuthor.set(author, name);
	      }
	      if (description != null) {
		descriptionByAuthor.set(author, description);
	      }
	      if (image != null) {
		if (typeof image === 'string') {
		  imageByAuthor.set(author, image);
		} else if (typeof image.link === 'string') {
		  imageByAuthor.set(author, image.link);
		}
	      }
	      if (publicWebHosting != null) {
		publicWebHostingByAuthor.set(author, publicWebHosting);
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
	      notificationsByAuthor.add(ssb.id, key);
	    } else {
	      if (isValidRoot) {
		if (rootsReferencedByAuthor.has(ssb.id)) {
		  if (rootsReferencedByAuthor.get(ssb.id).has(root)) {
		    notificationsByAuthor.add(ssb.id, key);
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
	notifications: notificationsByAuthor.get(ssb.id).size,
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
  })

  const nullImage = `&${"0".repeat(43)}=.sha256`;

  const api = {
    getName: (feedId) => {
      if (nameByAuthor.has(feedId)) {
	return nameByAuthor.get(feedId)
      } else {
	return feedId
      }
    },
    getImage: (feedId) => {
      if (imageByAuthor.has(feedId)) {
	return imageByAuthor.get(feedId)
      } else {
	return nullImage;
      }
    },
    getDescription: (feedId) => {
      if (descriptionByAuthor.has(feedId)) {
	return descriptionByAuthor.get(feedId)
      } else {
	return "";
      }
    },
    getPublicWebHosting: (feedId) =>
    publicWebHostingByAuthor.has(feedId) &&
    publicWebHostingByAuthor.get(feedId) === true,
    getNotifications: (feedId) => {
      if (notificationsByAuthor.has(feedId)) {
	const notifications = notificationsByAuthor.get(feedId);
	const tail = Array.from(notifications).slice(notifications.size - 64)
	return tail.map((key) => ({key, value: valuesByMessage.get(key)})).reverse()
      } else {
	return [];
      }
    },
    getLikes: (messageId) => {
      if (likesByMessage.has(messageId)) {
	    console.log(messageId);
	    console.log(likesByMessage.get(messageId))
	return likesByMessage.get(messageId);
      } else {
	return []
      }
    }
  }

  return api
};
