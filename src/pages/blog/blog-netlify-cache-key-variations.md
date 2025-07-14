---
title: "[Blog] Netlify cache key variations"
date: "2025-07-14"
author: "Mathias Biilmann"
excerpt: "Discover Netlify's new cache key variations feature, offering more control over cached content. This enhancement simplifies dynamic asset caching, adapting to evolving web ecosystems."
draft: false
---

Following the launch of [Cache-Tags and Purge API](https://www.netlify.com/blog/cache-tags-and-purge-api-on-netlify/), today we’re happy to announce yet another feature in the series of caching improvements that aim to give Netlify users more control over their cached content.

Netlify now supports a custom `Netlify-Vary` header, which instructs Netlify’s edge on how to better cache and serve dynamic assets using Netlify’s CDN with Netlify Functions, Netlify Edge Functions or [external services proxied to using redirect rules](https://docs.netlify.com/routing/redirects/rewrites-proxies/#proxy-to-another-service).

## Why is it important?

Netlify allows developers to choose which static response to be served and cached for a given request based on rules like [authentication, country or locale based conditions](https://docs.netlify.com/routing/redirects/redirect-options/), or even query parameters. This works great when serving static assets, but over the last couple of years the web ecosystem has evolved, and now there’s a big trend of building dynamic applications running in serverless functions or edge functions within our system.

Different types of dynamic resources may need to respect different parts of the incoming request when deciding whether to serve a cached response or not:

- Some resources don’t look at query parameters and will get a much higher cache hit rate by not taking these into account, while others use specific query parameters and need the cache to take those into account.
- Some resources might be cacheable depending on a cookie value (ie. no `is_logged_in` cookie might mean, “show a login page,” and `is_logged_in=1` cookie might mean, “show a logged in member page”).
- Some frameworks, like Next.js, depend on varying cached responses based on the value of specific headers like `RSC`, `Next-Router-Prefetch` and `Next-Router-State`.

The standard `Vary` header is very restrictive and generally meant for use cases like content negotiation, so Netlify offers a more flexible `Netlify-Vary` header, that gives fine-grained control over which parts of a request need to match the cached object.

## How do cache key variations work?

Netlify now supports a custom `Netlify-Vary` header, which takes a set of comma delimited instructions for what parts of the request to vary on:

- `query` vary by request URL query parameters
- `header` vary by the value of a request header
- `language` vary by the languages from the `Accept-Language` request header
- `country` vary by the country inferred from doing the GeoIP lookup on the request IP address
- `cookie` vary by a value of a request cookie

These instructions, together with the request URL, will define the cache key which Netlify uses to uniquely identify a cached object in our CDN.

### Query

By default, Netlify doesn’t take query parameters into account to construct the cache key, since things like `_utm` parameters or session IDs for analytics, social links, etc., can drastically reduce cache hit rates.

However, if you know that the responses from a resource will only depend on specific query parameters, like an `item_id`, `page`, or `per_page` parameter, you can change this behavior for a resource by adding `Netlify-Vary` to your dynamic content responses:

```javascript
Netlify-Vary: query=item_id|page|per_page
```

`Netlify-Vary` will tell Netlify to take just those 3 query parameters into account when deciding whether to serve a cached response, so other query parameters like `_utm` will not affect your cache hit rate.

If you'd like to include all query parameters when creating the cache key, you can achieve this by adding the following `Netlify-Vary` header:

```javascript
Netlify-Vary: query
```

### Header

You can now instruct Netlify Edge to vary content on specific headers, so your business logic can be transported as a header and still influence the cache. To control which headers go into the cache key, you can use the `header` instruction like this:

```javascript
Netlify-Vary: header=device-type
```

This will make the cache take a custom `Device-Type` header into account for the cache key and distinguish between objects with different `Device-Type` header values. For example, different users trying to access your platform from different device types (e.g. `mobile`, `web`, etc.) will see different custom content for each type of device.

Similarly to query parameter variations, you can also provide a list of headers:

```javascript
Netlify-Vary: header=device-type|app-version
```

### Cookie

Cookies serve a variety of purposes, but one of their common use cases is A/B testing. However, cookies often contain additional information, such as authentication details or analytics data. In such scenarios, you don’t want to vary the cached content on the entirety of the cookie value, but just on a couple of key-value pairs.

Similarly to query variations, you can target a subset of cookie key-value parameters to be considered on the cache key:

```javascript
Netlify-Vary: cookie=ab_test_name|ab_test_bucket
```

This will tell Netlify to vary cached content based off the values for both `ab_test_name` and `ab_test_bucket` set on the request’s `Cookie` header.

### Language & Country

One of the most common use cases for cached content variations is varying the content depending on user features such as language and geolocation.

To vary on the user’s language, you can specify groups of languages to take into account for your cache key. These are based on the `Accept-Language` header from the request. For example, the following instruction will keep different cache objects for users with English as an accepted language, users with German as an accepted language, and all other users.

```javascript
Netlify-Vary: language=en|de
```

To group more languages together, use `+`:

```javascript
Netlify-Vary: language=en|es+pt|da+nl+de
```

This will vary the cached content for clients accepting English, clients accepting Spanish or Portuguese, and clients accepting Danish, Dutch, or German, as well as the unlisted group of all other clients.

Similarly, to vary cached content based on the geographical origin of the request, you can specify groups of countries to take into account for your cache key. The following instruction will keep different cache objects for users located in England, users in Spain or Portugal, and users in Denmark, The Netherlands, or Germany, as well as the unlisted group of all other users.

```javascript
Netlify-Vary: country=en|es+pt|dk+nl+de
```

### Combine instructions

You can use any combination of the above variation instructions to vary your cached content on:

```javascript
Netlify-Vary: country=es+de|us,query
```

This will tell Netlify to take both the entire query into account for cached objects, as well as the request’s country of origin.

## Try it out today

We’ve created a [demo repository](https://github.com/netlify-labs/cache-key-variations) where you can explore these patterns yourself and see them in action on Netlify Edge at [the demo site](https://cache-key-variations.netlify.app/).

Visit [our documentation](https://docs.netlify.com/platform/caching/) for more information on how to get started.

## What’s next for edge caching on Netlify?

We’re thrilled to have brought you all these new caching features, unlocking more complex use cases and potentially making your current caching logic for dynamic assets much simpler and more intuitive.

Our team is committed to making Netlify the world’s most advanced global caching infrastructure, and we’re looking forward to further evolving our platform to continue to serve your needs by building either simple web pages or a full-fledged web platform.