# Hacks

This file should contain a list of hacks that are confusing or weird.

## ESLINT-KOA-HACK

We have a small problem where Koa lets us define routes like this:

```javascript
router.get("/public/latest", async ctx => {
  ctx.body = await post.latest();
});
```

Unfortunately ESLint thinks that the `await` is going to cause trouble and it
demands atomic updates, but if we remove `await` then Koa thinks the route is
over and sends the HTTP response. We need to appease the linter and keep the
HTTP response from being sent, so we use this:

```javascript
await post.latest().then(result => {
  ctx.body = result;
});
```

This is one of the few times you want both `await` and `.then()`, but it works
well for us here.
