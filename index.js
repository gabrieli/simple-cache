const moment = require('moment')

const CACHE = {
  CAMPAIGN_GET_ALL: {
    response: null,
    lastSuccess: null,
    lastAttempt: null,
    meta: {
      refreshTimeout: 10,
      cacheValidity: 5 * 60,
    },
  },
}

const cacheExpired = cache =>
  cache.lastSuccess <
  moment()
    .subtract(cache.meta.cacheValidity, 'seconds')
    .valueOf()

const refreshTimedOut = cache =>
  cache.lastAttempt <
  moment()
    .subtract(cache.meta.refreshTimeout, 'seconds')
    .valueOf()

const isRefreshing = cache => {
  return cache.lastAttempt
}

const responseHandler = cache => response => {
  cache.response = response
  cache.lastSuccess = moment().valueOf()
  cache.lastAttempt = null
}

const refreshCache = (cache, queryCallback) => {
  cache.lastAttempt = moment().valueOf()
  queryCallback().then(responseHandler(cache))
}

const initCache = async (cache, queryCallback) => {
  cache.lastAttempt = moment().valueOf()
  await queryCallback().then(responseHandler(cache))
}

const resetCache = () => {
  Object.keys(CACHE).forEach(key => {
    CACHE[key].response = null
    CACHE[key].lastSuccess = null
    CACHE[key].lastAttempt = null
  })
}

const useCache = async (cache, queryCallback, refreshTimeoutCallback) => {
  // Cache not initialised
  if (!cache.response) {
    await initCache(cache, queryCallback)
    return cache.response
  }

  // Cache still valid
  if (!cacheExpired(cache)) {
    return cache.response
  }

  // Cache invalid and not refreshing
  if (!isRefreshing(cache)) {
    refreshCache(cache, queryCallback)
    return cache.response
  }

  if (refreshTimedOut(cache)) {
    // Refreshing timed out
    refreshCache(cache, queryCallback)
    if (refreshTimeoutCallback) refreshTimeoutCallback()
    return cache.response
  } else {
    // Refreshing is ongoing now
    return cache.response
  }
}

module.exports = { CACHE, useCache, resetCache }
