const { useCache } = require('./cache')
const moment = require('moment')

describe('For a suite of tests implementing memory cached promises', () => {
  const meta = {
    refreshTimeout: 10,
    cacheValidity: 5 * 60,
  }
  const promise = new Promise(resolve => {
    setTimeout(function() {
      resolve('foo')
    }, 1)
  })
  const callback = jest.fn(() => promise)
  const timeoutCallback = jest.fn()

  beforeEach(() => callback.mockClear())

  describe('Cache is empty', () => {
    let emptyCache, result

    beforeEach(() => {
      emptyCache = {
        response: null,
        lastSuccess: null,
        lastAttempt: null,
        meta,
      }
    })
    beforeEach(async () => {
      result = await useCache(emptyCache, callback)
    })

    it('Will return the new value of the cache', () => {
      expect(result).toBe('foo')
    })
    it('Cache will contain response and lastSuccess', () => {
      expect(emptyCache).toEqual({
        response: 'foo',
        lastSuccess: expect.anything(),
        lastAttempt: null,
        meta,
      })
    })
    it('Will call the query callback', () => {
      expect(callback).toHaveBeenCalled()
    })
  })
  describe('Cache is still valid', () => {
    const lastSuccess = moment()
      .subtract(4, 'minutes')
      .valueOf()
    let validCache, result

    beforeEach(() => {
      validCache = {
        response: 'fooBar',
        lastSuccess,
        lastAttempt: null,
        meta,
      }
    })

    beforeEach(async () => {
      result = await useCache(validCache, callback)
    })

    it('Does not modify the cache', () => {
      expect(result).toBe('fooBar')
      expect(validCache).toEqual({
        response: 'fooBar',
        lastSuccess,
        lastAttempt: null,
        meta,
      })
    })
    it('Returns the current cached value', () => {
      expect(result).toBe('fooBar')
    })
    it('Does not call the callback', () => {
      expect(callback).not.toHaveBeenCalled()
    })
  })
  describe('Cache is invalid', () => {
    describe('Cache is not refreshing', () => {
      const lastSuccess = moment()
        .subtract(6, 'minutes')
        .valueOf()
      let invalidCache, result

      beforeEach(() => {
        invalidCache = {
          response: 'fooBar',
          lastSuccess,
          lastAttempt: null,
          meta,
        }
      })

      beforeEach(async () => {
        result = await useCache(invalidCache, callback)
      })

      it('Returns the current value of the cache', () => {
        expect(result).toBe('fooBar')
      })
      it('Does modify the cache', async () => {
        await callback()
        expect(invalidCache).toEqual({
          response: 'foo',
          lastSuccess: expect.anything(),
          lastAttempt: null,
          meta,
        })
      })
      it('Does call the callback', () => {
        expect(callback).toHaveBeenCalled()
      })
    })
    describe('Cache is within the refreshing period', () => {
      const lastSuccess = moment()
        .subtract(6, 'minutes')
        .valueOf()
      const lastAttempt = moment()
        .subtract(4, 'seconds')
        .valueOf()
      let invalidCache, result

      beforeEach(() => {
        invalidCache = {
          response: 'fooBar',
          lastSuccess,
          lastAttempt,
          meta,
        }
      })

      beforeEach(async () => {
        result = await useCache(invalidCache, callback, timeoutCallback)
      })

      it('Returns the current value of the cache', () => {
        expect(result).toBe('fooBar')
      })
      it('Does not modify the cache', async () => {
        expect(invalidCache).toEqual({
          response: 'fooBar',
          lastSuccess,
          lastAttempt,
          meta,
        })
      })
      it('Does not call the callback', () => {
        expect(callback).not.toHaveBeenCalled()
      })
      it('Does not call the timeout callback', () => {
        expect(timeoutCallback).not.toHaveBeenCalled()
      })
    })
    describe('Cache refresh timed out', () => {
      const lastSuccess = moment()
        .subtract(6, 'minutes')
        .valueOf()
      const lastAttempt = moment()
        .subtract(20, 'seconds')
        .valueOf()
      let invalidCache, result

      beforeEach(() => {
        invalidCache = {
          response: 'fooBar',
          lastSuccess,
          lastAttempt,
          meta,
        }
      })

      beforeEach(async () => {
        result = await useCache(invalidCache, callback, timeoutCallback)
      })

      it('Returns the current value of the cache', () => {
        expect(result).toBe('fooBar')
      })
      it('Modifies the cache after a new request is made', async () => {
        expect(invalidCache).toEqual({
          response: 'foo',
          lastSuccess: expect.anything(),
          lastAttempt: null,
          meta,
        })
      })
      it('Calls the query callback', () => {
        expect(callback).toHaveBeenCalled()
      })
      it('Calls the timeout callback', () => {
        expect(timeoutCallback).toHaveBeenCalled()
      })
    })
  })
})
