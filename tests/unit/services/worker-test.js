/* eslint-disable func-style, no-magic-numbers, prefer-const */
import { hash } from 'rsvp';

import { moduleFor, test } from 'ember-qunit';
// const DELAY = 50;
let service;
const { Worker } = window;
const testData = { foo: 'foo' };

moduleFor('service:worker', 'Unit | Service | worker', {
  beforeEach() {
    service = this.subject({
      webWorkersPath: '../assets/web-workers/'
    });
  },
  afterEach() {
    service.terminate();
  }
});

test('it exists', (assert) => {
  assert.ok(service, 'service exists');
});

test('its enabled if worker exists', (assert) => {
  assert.equal(service.get('isEnabled'), Boolean(Worker));
  assert.equal(service.get('_cache.length'), 0);
});

test('it rejects promise if worker does not exist', (assert) => {
  return service.postMessage('fail').catch(() => {
    assert.ok(1);
    assert.equal(service.get('_cache.length'), 0);
  });
});

test('it resolves promise if worker exist', (assert) => {
  return service.postMessage('response', testData).then((data) => {
    assert.deepEqual(data, testData);
    assert.equal(service.get('_cache.length'), 0);
  });
});

test('it resolves delayed response', (assert) => {
  return service.postMessage('delayed-response', testData).then((data) => {
    assert.deepEqual(data, testData);
    assert.equal(service.get('_cache.length'), 0);
  });
});

test('it rejects promise if worker throws an error', (assert) => {
  return service.postMessage('error').catch((error) => {
    assert.equal(error, 'Uncaught Error: foo');
    assert.equal(service.get('_cache.length'), 0);
  });
});

test('it resolves simultaneous requests', (assert) => {
  assert.expect(4);

  let delayedPromise = service.postMessage('delayed-response', testData);
  let promise = service.postMessage('response', testData).then((data) => {
    // Check pending delayed promise
    assert.equal(service.get('_cache.length'), 1);

    return data;
  });

  return hash({ promise, delayedPromise }).then((data) => {
    assert.deepEqual(data.promise, testData);
    assert.deepEqual(data.delayedPromise, testData);
    assert.equal(service.get('_cache.length'), 0);
  });
});

test('it can terminate a pending promise', (assert) => {
  let done = assert.async();
  let promise = service.postMessage('delayed-response');

  promise.then(() => {
    assert.ok(0);
  }, () => {
    assert.equal(service.get('_cache.length'), 0);
  }).finally(done);

  service.terminate(promise);
});

test('it can terminate all promises', (assert) => {
  service.postMessage('no-response');
  service.postMessage('no-response');
  service.postMessage('no-response');

  assert.equal(service.get('_cache.length'), 3);

  service.terminate();

  assert.equal(service.get('_cache.length'), 0);
});

test('it resolves promise when event starts', (assert) => {
  return service.on('subscription', () => {}).then(() => {
    assert.equal(service.get('_cache.length'), 1);
  });
});

test('it subscribes to a worker', (assert) => {
  let callback = () => {};

  return service.on('subscription', callback).then(() => {
    assert.equal(service.get('_cache.length'), 1);
    service.off('subscription', callback);
  });
});

test('it executes callback when receives data', (assert) => {
  assert.expect(4);

  let count = 0;
  let done = assert.async();
  let callback = (data) => {
    if (count >= 3) {
      service.off('subscription', callback);
      done();
    } else {
      assert.equal(data.index, count);
      count++;
    }
  };

  service.on('subscription', callback).then(() => {
    assert.equal(service.get('_cache.length'), 1);
  });
});

test('it resolves promise when event stops', (assert) => {
  assert.expect(2);

  let callback = () => {};

  return service.on('subscription', callback).then(() => {
    assert.equal(service.get('_cache.length'), 1);

    return service.off('subscription', callback).then(() => {
      assert.equal(service.get('_cache.length'), 0);
    });
  });
});

test('it unsubscribes from a worker', (assert) => {
  assert.expect(2);

  let callback = () => {};
  let subscriptionPromise = service.on('subscription', callback);

  assert.equal(service.get('_cache.length'), 1);

  return subscriptionPromise.then(() => {
    return service.off('subscription', callback).then(() => {
      assert.equal(service.get('_cache.length'), 0);
    });
  });
});

test('it can start a worker', (assert) => {
  return service.open('increment').then((worker) => {
    assert.equal(service.get('_cache.length'), 1);
    assert.equal(typeof worker, 'object');
    assert.equal(typeof worker.postMessage, 'function');
    assert.equal(typeof worker.terminate, 'function');
    worker.terminate();
  });
});

test('it can send/receive messages from an active connection', (assert) => {
  return service.open('increment').then((worker) => {
    assert.equal(service.get('_cache.length'), 1);

    return worker.postMessage({ index: 0 }).then((data) => {
      assert.equal(data.index, 1);

      return worker.postMessage({ index: 1 }).then((data) => {
        assert.equal(data.index, 2);

        worker.terminate();
      });
    });
  });
});
