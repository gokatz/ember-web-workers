self.addEventListener('message', function(e) {
  let data = e.data;
  let port = e.ports[0];

  port.postMessage({ index: data.index + 1 });
}, false);

postMessage(true);
