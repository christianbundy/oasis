const fs = require("fs").promises
const path = require("path")
const { execSync } = require("child_process")

const normalizeUrl = url => {
  const plusIndex = url.indexOf("+")
  if (plusIndex !== -1) {
    return url.slice(plusIndex + 1)
  } else {
    return url
  }
}

const repositories = []
const extractRepository = packageObject => {
  const { name } = packageObject
  const { repository } = packageObject

  if (repository) {
    if (typeof repository === "string") {
      repositories.push({ name, url: repository })
    } else if (typeof repository.url === "string") {
      repositories.push({ name, url: repository.url })
    } else {
      throw new Error("Unknown repository format:", repository)
    }
  } else {
    console.log("Missing:", packageObject.name)
  }
}

let count = 0
const main = async () => {
  const root = __dirname

  const walk = async paths => {
    const newPath = path.join(...paths)
    const dir = await fs.readdir(newPath, { withFileTypes: true })
    const lastPathSegment = paths[paths.length - 1]
    return Promise.all(
      dir.map(async dirent => {
        const x = dirent.name
        if (dirent.isDirectory()) {
          const packagePath = path.join(...paths, "package.json")
          return fs
            .access(packagePath)
            .then(async () => {
              const packageJson = await fs.readFile(packagePath, "utf8")
              const packageObject = JSON.parse(packageJson)
              extractRepository(packageObject)
              count += 1
              return walk([...paths, x])
            })
            .catch(() => {
              return walk([...paths, x])
            })
        }
      })
    )
  }

  return walk([process.cwd()])
}

main().then(async () => {
  console.log(count)
  console.log(`${repositories.length} / ${count}`)
  const cwd = "/home/christianbundy/src/fuk"

  const justFinished = []

  repositories
    .reverse()
    .map(({ name, url }) => ({ name, url: normalizeUrl(url) }))
    .forEach(repo => {
      const thePath = path.join(cwd, repo.name)
      fs.stat(path.join(cwd, repo.name))
        .then(() => {
          console.log
        })
        .catch(() => {
          // HACK: dirty nasty hack
          if (justFinished.indexOf(thePath) !== -1) {
            return
          } else {
            justFinished.push(thePath)
          }
          // DNE
          let branchString = ""
          let { url } = repo
          let depthFlag = "--depth 1"

          if (repo.url === "https://github.com/medikoo/es5-ext/tree/ext") {
            console.log("problem")
            repo.url = "https://github.com/medikoo/es5-ext#ext"
          }

          if (repo.url.startsWith("ssb://")) {
            url = `https://git.scuttlebot.io/${encodeURIComponent(
              repo.url.slice(6)
            )}`
            depthFlag = ""
          }

          const hashIndex = repo.url.indexOf("#")
          if (hashIndex !== -1) {
            url = repo.url.slice(0, hashIndex)
            branchString = `--single-branch --branch ${repo.url.slice(
              hashIndex + 1
            )}`
          }

          console.log(repo.name)
          execSync(
            `git clone ${branchString} ${depthFlag} ${url} ${repo.name}`,
            {
              cwd
            }
          )
        })
    })
})
