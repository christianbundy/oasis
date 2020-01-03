'use strict'

const Koa = require('koa')
const debug = require('debug')('oasis')
const koaBody = require('koa-body')
const koaStatic = require('koa-static')
const mount = require('koa-mount')
const open = require('open')
const path = require('path')
const pull = require('pull-stream')
const requireStyle = require('require-style')
const router = require('koa-router')()
const ssbMentions = require('ssb-mentions')
const ssbRef = require('ssb-ref')

let sharp
try {
  sharp = require('sharp')
} catch (e) {
  // Optional dependency
}

const aboutModel = require('./models/about')
const blobModel = require('./models/blob')
const friendModel = require('./models/friend')
const metaModel = require('./models/meta')
const postModel = require('./models/post')
const voteModel = require('./models/vote')

const authorView = require('./views/author')
const commentView = require('./views/comment')
const listView = require('./views/list')
const markdownView = require('./views/markdown')
const metaView = require('./views/meta')
const publicView = require('./views/public')
const replyView = require('./views/reply')
const searchView = require('./views/search')

const defaultTheme = 'atelier-sulphurPool-light'.toLowerCase()

module.exports = config => {
  const assets = new Koa()
  assets.use(koaStatic(path.join(__dirname, 'assets')))

  const app = new Koa()
  module.exports = app

  app.on('error', e => {
    // Output full error objects
    e.message = e.stack
    e.expose = true

    console.error(e)
    return null
  })

  app.use(mount('/assets', assets))

  // headers
  app.use(async (ctx, next) => {
    await next()

    const csp = [
      "default-src 'none'",
      "img-src 'self'",
      "form-action 'self'",
      "media-src 'self'",
      "style-src 'self' 'unsafe-inline'"
    ].join('; ')

    // Disallow scripts.
    ctx.set('Content-Security-Policy', csp)

    // Disallow <iframe> embeds from other domains.
    ctx.set('X-Frame-Options', 'SAMEORIGIN')

    // Disallow browsers overwriting declared media types.
    ctx.set('X-Content-Type-Options', 'nosniff')

    // Disallow sharing referrer with other domains.
    ctx.set('Referrer-Policy', 'same-origin')

    // Disallow extra browser features except audio output.
    ctx.set('Feature-Policy', "speaker 'self'")

    if (ctx.method !== 'GET') {
      const referer = ctx.request.header.referer
      ctx.assert(referer != null, `HTTP ${ctx.method} must include referer`)
      const refererUrl = new URL(referer)
      const isBlobUrl = refererUrl.pathname.startsWith('/blob/')
      ctx.assert(
        isBlobUrl === false,
        `HTTP ${ctx.method} from blob URL not allowed`
      )
    }
  })

  router
    .param('imageSize', (imageSize, ctx, next) => {
      const size = Number(imageSize)
      const isInteger = size % 1 === 0
      const overMinSize = size > 2
      const underMaxSize = size <= 256
      ctx.assert(
        isInteger && overMinSize && underMaxSize,
        'Invalid image size'
      )
      return next()
    })
    .param('blobId', (blobId, ctx, next) => {
      ctx.assert(ssbRef.isBlob(blobId), 400, 'Invalid blob link')
      return next()
    })
    .param('message', (message, ctx, next) => {
      ctx.assert(ssbRef.isMsg(message), 400, 'Invalid message link')
      return next()
    })
    .param('feed', (message, ctx, next) => {
      ctx.assert(ssbRef.isFeedId(message), 400, 'Invalid feed link')
      return next()
    })
    .get('/', async ctx => {
      ctx.redirect('/public/popular/day')
    })
    .get('/public/popular/:period', async ctx => {
      // TODO: Fix layer violation. The controller should not be making HTML.
      const { nav, ul, li, a } = require('hyperaxe')

      const { period } = ctx.params
      const messages = await postModel.popular({ period })

      const option = somePeriod =>
        li(
          period === somePeriod
            ? a({ class: 'current', href: `./${somePeriod}` }, somePeriod)
            : a({ href: `./${somePeriod}` }, somePeriod)
        )

      const prefix = nav(
        ul(option('day'), option('week'), option('month'), option('year'))
      )

      ctx.body = publicView({
        messages,
        prefix
      })
    })
    .get('/public/latest', async ctx => {
      const messages = await postModel.latest()
      ctx.body = publicView({ messages })
    })
    .get('/author/:feed', async ctx => {
      const { feed } = ctx.params
      const feedId = feed
      const description = await aboutModel.description(feedId)
      const name = await aboutModel.name(feedId)
      const image = await aboutModel.image(feedId)
      const messages = await postModel.fromFeed(feedId)
      const relationship = await friendModel.getRelationship(feedId)

      const avatarUrl = `/image/256/${encodeURIComponent(image)}`

      ctx.body = authorView({
        feedId,
        messages,
        name,
        description,
        avatarUrl,
        relationship
      })
    })
    .get('/search/', async ctx => {
      let { query } = ctx.query
      if (typeof query === 'string') {
        // https://github.com/ssbc/ssb-search/issues/7
        query = query.toLowerCase()
      }

      const messages = await postModel.search({ query })

      ctx.body = searchView({ messages, query })
    })
    .get('/inbox', async ctx => {
      const messages = await postModel.inbox()

      ctx.body = listView({ messages })
    })
    .get('/hashtag/:channel', async ctx => {
      const { channel } = ctx.params
      const messages = await postModel.fromHashtag(channel)

      ctx.body = listView({ messages })
    })
    .get('/theme.css', ctx => {
      const theme = ctx.cookies.get('theme') || defaultTheme

      const packageName = '@fraction/base16-css'
      const filePath = `${packageName}/src/base16-${theme}.css`
      ctx.type = 'text/css'
      ctx.body = requireStyle(filePath)
    })
    .get('/profile/', async ctx => {
      const myFeedId = await metaModel.myFeedId()

      const description = await aboutModel.description(myFeedId)
      const name = await aboutModel.name(myFeedId)
      const image = await aboutModel.image(myFeedId)
      const messages = await postModel.fromFeed(myFeedId)

      const avatarUrl = `/image/256/${encodeURIComponent(image)}`

      ctx.body = authorView({
        feedId: myFeedId,
        messages,
        name,
        description,
        avatarUrl,
        relationship: null
      })
    })
    .get('/json/:message', async ctx => {
      const { message } = ctx.params
      ctx.type = 'application/json'
      const json = await metaModel.get(message)
      ctx.body = JSON.stringify(json, null, 2)
    })
    .get('/blob/:blobId', async ctx => {
      const { blobId } = ctx.params
      const bufferSource = await blobModel.get({ blobId })

      debug('got buffer source')
      ctx.body = await new Promise(resolve => {
        pull(
          bufferSource,
          pull.collect(async (err, bufferArray) => {
            if (err) {
              await blobModel.want({ blobId })
              resolve(Buffer.alloc(0))
            } else {
              const buffer = Buffer.concat(bufferArray)
              resolve(buffer)
            }
          })
        )
      })

      if (ctx.body.length === 0) {
        ctx.response.status = 404
      } else {
        ctx.set('Cache-Control', 'public,max-age=31536000,immutable')
      }

      // This prevents an auto-download when visiting the URL.
      ctx.attachment(blobId, { type: 'inline' })
    })
    .get('/image/:imageSize/:blobId', async ctx => {
      const { blobId, imageSize: stringImageSize } = ctx.params
      ctx.body = 'wat'
      const imageSize = Number(stringImageSize)
      ctx.type = 'image/png'

      const fakePixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      )

      const fakeImage = imageSize =>
        sharp
          ? sharp({
            create: {
              width: imageSize,
              height: imageSize,
              channels: 4,
              background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0.5
              }
            }
          })
          : new Promise(resolve => resolve(fakePixel))

      const fakeId = '&0000000000000000000000000000000000000000000=.sha256'

      const bufferSource = await blobModel.get({ blobId })

      ctx.body = await new Promise((resolve) => {
        if (blobId === fakeId) {
          debug('fake image')
          fakeImage(imageSize).then(result => resolve(result))
        } else {
          debug('not fake image')
          pull(
            bufferSource,
            pull.collect(async (err, bufferArray) => {
              if (err) {
                blobModel.want({ blobId })
                fakeImage(imageSize).then((result) => {
                  debug({ result })
                  ctx.body = result
                })
              } else {
                const buffer = Buffer.concat(bufferArray)

                if (sharp) {
                  sharp(buffer)
                    .resize(imageSize, imageSize)
                    .png()
                    .toBuffer()
                    .then(data => {
                      resolve(data)
                    })
                } else {
                  resolve(buffer)
                }
              }
            })
          )
        }
      })
    })
    .get('/meta/', async ctx => {
      const theme = ctx.cookies.get('theme') || defaultTheme
      const status = await metaModel.status()
      const peers = await metaModel.peers()

      const { themeNames } = require('@fraction/base16-css')

      ctx.body = metaView({ status, peers, theme, themeNames })
    })
    .get('/likes/:feed', async ctx => {
      const { feed } = ctx.params
      const messages = await postModel.likes({ feed })
      ctx.body = listView({ messages })
    })
    .get('/meta/readme/', async ctx => {
      ctx.body = await markdownView(config.readme)
    })
    .get('/mentions/', async ctx => {
      const messages = await postModel.mentionsMe()

      ctx.body = listView({ messages })
    })
    .get('/thread/:message', async ctx => {
      const { message } = ctx.params
      const messages = await postModel.fromThread(message)
      debug('got %i messages', messages.length)

      ctx.body = listView({ messages })
    })
    .get('/reply/:message', async ctx => {
      const { message } = ctx.params
      const parentId = message

      const rootMessage = await postModel.get(parentId)
      const myFeedId = await metaModel.myFeedId()

      debug('%O', rootMessage)
      const messages = [rootMessage]

      ctx.body = await replyView({ messages, myFeedId })
    })
    .get('/comment/:message', async ctx => {
      const { message } = ctx.params
      const parentId = message
      const parentMessage = await postModel.get(parentId)
      const myFeedId = await metaModel.myFeedId()

      const hasRoot =
        typeof parentMessage.value.content.root === 'string' &&
        ssbRef.isMsg(parentMessage.value.content.root)
      const hasFork =
        typeof parentMessage.value.content.fork === 'string' &&
        ssbRef.isMsg(parentMessage.value.content.fork)

      const rootMessage = hasRoot
        ? hasFork
          ? parentMessage
          : await postModel.get(parentMessage.value.content.root)
        : parentMessage

      const messages = await postModel.threadReplies(rootMessage.key)

      messages.push(rootMessage)

      ctx.body = await commentView({ messages, myFeedId, parentMessage })
    })
    .post('/reply/:message', koaBody(), async ctx => {
      const { message } = ctx.params
      const text = String(ctx.request.body.text)
      // TODO: rename `message` to `parent` or `ancestor` or similar
      const mentions =
        ssbMentions(text).filter(mention => mention != null) || undefined

      const parent = await postModel.get(message)
      ctx.body = await postModel.reply({
        parent,
        message: { text, mentions }
      })
      ctx.redirect(`/thread/${encodeURIComponent(message)}`)
    })
    .post('/comment/:message', koaBody(), async ctx => {
      const { message } = ctx.params
      const text = String(ctx.request.body.text)
      // TODO: rename `message` to `parent` or `ancestor` or similar
      const mentions =
        ssbMentions(text).filter(mention => mention != null) || undefined
      const parent = await metaModel.get(message)

      ctx.body = await postModel.comment({
        parent,
        message: { text, mentions }
      })
      ctx.redirect(`/thread/${encodeURIComponent(message)}`)
    })
    .post('/publish/', koaBody(), async ctx => {
      const text = String(ctx.request.body.text)
      const mentions =
        ssbMentions(text).filter(mention => mention != null) || undefined

      ctx.body = await postModel.root({
        text,
        mentions
      })
      ctx.redirect('/')
    })
    .post('/like/:message', koaBody(), async ctx => {
      const { message } = ctx.params

      // TODO: convert all so `message` is full message and `messageKey` is key
      const messageKey = message

      const voteValue = Number(ctx.request.body.voteValue)

      const encoded = {
        message: encodeURIComponent(message)
      }

      const referer = new URL(ctx.request.header.referer)
      referer.hash = `centered-footer-${encoded.message}`

      const value = Number(voteValue)
      const messageData = await postModel.get(messageKey)

      const isPrivate = messageData.value.meta.private === true
      const messageRecipients = isPrivate
        ? messageData.value.content.recps
        : []
      const normalized = messageRecipients.map(recipient => {
        if (typeof recipient === 'string') {
          return recipient
        }

        if (typeof recipient.link === 'string') {
          return recipient.link
        }

        return null
      })

      const recipients = normalized.length > 0 ? normalized : undefined

      ctx.body = await voteModel.publish({
        messageKey,
        value,
        recps: recipients
      })
      ctx.redirect(referer)
    })
    .post('/theme.css', koaBody(), async ctx => {
      const theme = String(ctx.request.body.theme)
      ctx.cookies.set('theme', theme)
      const referer = new URL(ctx.request.header.referer)
      ctx.redirect(referer)
    })

  app.use(router.routes())

  const { host } = config
  const { port } = config
  const uri = `http://${host}:${port}/`

  console.error(`Listening on ${uri}`)

  app.listen({ host, port })

  if (config.open === true) {
    open(uri)
  }
}
