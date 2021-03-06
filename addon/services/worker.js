import { assert } from '@ember/debug';
import { A } from '@ember/array';
import RSVP from 'rsvp';
import { get } from '@ember/object';
import Service from '@ember/service';
import Evented, { on } from '@ember/object/evented';
import { isPresent } from '@ember/utils';

function messageListener(meta, event) {
  let ping = event.data === true;
  // Check if the worker has been instantiated via event listener:
  // worker.on('name', data, callback);
  if (get(meta, 'keepAlive')) {
    let callback = get(meta, 'callback');

    if (ping) {
      // A 'true' message tell us that the worker has been created correctly,
      // then resolve the promise returned by the event listener.
      this.trigger('resolve', meta);
    } else if (callback) {
      // The worker is sending data, call the callback this the event data.
      callback(event.data);
    } else {
      // Receiving data from a worker created via 'open'.
      this.trigger('resolve', meta, event.data);
    }
    // If the response is equals to 'true' we should ignore it because
    // the worker is pinging us to tell that everything is correct.
  } else if (!ping) {
    // Resolve the promise returned by the method 'postMessage' with the event data.
    this.trigger('resolve', meta, event.data);
  }
}

function errorListener(meta, error) {
  // An error has ocurrect, reject the promise and kill the worker.
  this.trigger('reject', meta, error.message);
}

export default Service.extend(Evented, {

  /**
	 * Check if workers are enabled.
	 *
	 * @property isEnabled
	 * @type Boolean
	 */
  isEnabled: Boolean(window.Worker),

  /**
	 * Static workers file path.
	 *
	 * @property webWorkersPath
	 * @type String
	 */
  webWorkersPath: 'assets/web-workers/',

  /**
	 * Initialize metadata array.
	 *
	 * @method init
	 */
  init() {
    this._super(...arguments);
    // Initialize metadata array, it will store all running workers with their own promises/callbacks.
    this.set('_cache', A([]));
  },

  /**
	 * Start a worker and attach the events given a name.
	 *
	 * @method _wakeup
   * @param String name
   * @param Function callback
   * @return Object
	 */
  _wakeUp(name, callback, keepAlive = false) {
    assert('You must provide the worker name', isPresent(name));

    // 'keepAlive' will store if the worker should still alive after sending a message.
    // let worker = new window.Worker(`${this.get('webWorkersPath')}${name}.js`);
    let worker = this.spawnWorker(`${this.get('webWorkersPath')}${name}.js`);
    let deferred = RSVP.defer('Worker: sending message');
    let meta = {
      keepAlive,
      worker,
      name,
      deferred,
      callback
    };

    // Attach the worker events.
    worker.addEventListener('message', messageListener.bind(this, meta));
    worker.addEventListener('error', errorListener.bind(this, meta));

    return meta;
  },

  spawnWorker(workerPath) {
    if (window.location.origin === (new URL(workerPath)).origin) {
      return new window.Worker(workerPath);
    }
    let blob = new Blob([
      `importScripts("${workerPath}")`
    ]);
    return new Worker(URL.createObjectURL(blob));
  },

  /**
	 * Resolve pending promise.
	 *
	 * @method _onResolve
   * @param Object data
	 */
  _onResolve: on('resolve', function(meta, data) {
    let deferred = get(meta, 'deferred');

    if (!get(meta, 'keepAlive')) {
      this._cleanMeta(meta);
    }
    deferred.resolve(data);
  }),

  /**
	 * Reject pending promise.
	 *
	 * @method _onReject
   * @param Object meta
	 */
  _onReject: on('reject', function (meta, error) {
    this._cleanMeta(meta);
    get(meta, 'deferred').reject(error);
  }),

  /**
	 * Clean request metadata & kill worker if neccessary.
	 *
	 * @method _cleanMeta
   * @param Object meta
	 */
  _cleanMeta(meta) {
    this._sleep(get(meta, 'worker'));
    this.get('_cache').removeObject(meta);
  },

  /**
	 * Kill worker.
	 *
	 * @method _sleep
   * @param Worker worker
	 */
  _sleep(worker) {
    worker.terminate();
  },

  /**
	 * Cancel pending promise.
	 *
	 * @method terminate
   * @param Ember.RSVP promise
   */
  terminate(promise) {
    let _cache = this.get('_cache');
    let index = _cache.length;

    // Reverse loop to prevent errors (this loop iterates a collection while deletes its items)
    while (index--) {
      let meta = _cache[index];
      let deferred = get(meta, 'deferred');

      // If promise exists reject it, if not reject all.
      if ((deferred.promise === promise) || !promise) {
        this.trigger('reject', meta);
      }
    }
  },

  /**
	 * Send event to the worker and terminate it when responses.
	 *
	 * @method postMessage
   * @param String name
   * @param Object data
	 * @return Mixed
	 */
  postMessage(name, data) {
    assert('Workers are disabled', this.get('isEnabled'));

    let meta = this._wakeUp(name);

    this.get('_cache').pushObject(meta);
    get(meta, 'worker').postMessage(data);

    return get(meta, 'deferred.promise');
  },

  /**
	 * Suscribe to a worker.
	 *
	 * @method on
   * @param String name
   * @param Object data
   * @param Function callback
	 */
  on(name, callback) {
    assert('Cannot register an event with no callback', typeof callback === 'function');

    let meta = this._wakeUp(name, callback, true);

    this.get('_cache').pushObject(meta);

    return get(meta, 'deferred.promise');
  },

  /**
	 * Suscribe to a worker.
	 *
	 * @method off
   * @param String name
   * @param Function callback
	 */
  off(name, callback) {
    let meta;
    if (callback) {
      assert('Callback should be a function', typeof callback === 'function');
      let matchingWorker = this.get('_cache').find((meta) => (name === meta.name && callback === meta.callback));
      meta = matchingWorker ? [matchingWorker] : [];
    } else {
      meta = this.get('_cache').filter((meta) => name === meta.name);
    }

    if (meta.length) {
      meta.forEach((workerData) => {
        this._cleanMeta(workerData);
      })
      return RSVP.resolve();
    }

    return RSVP.reject('Worker: event does not exist');
  },

  /**
	 * Start a worker.
	 *
	 * @method open
   * @param String name
	 */
  open(name) {
    let meta = this._wakeUp(name, null, true);
    let promise = get(meta, 'deferred.promise').then(() => ({
      postMessage: (data) => {
        let deferred = RSVP.defer();
        let channel = new MessageChannel();

        channel.port2.onmessage = (e) => deferred.resolve(e.data);
        get(meta, 'worker').postMessage(data, [channel.port1]);

        return deferred.promise;
      },
      terminate: () => {
        this._cleanMeta(meta);
        return RSVP.resolve();
      }
    }));

    this.get('_cache').pushObject(meta);

    return promise;
  }

});
