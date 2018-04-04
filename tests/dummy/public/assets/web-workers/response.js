self.addEventListener('message', function(e) {
  let data = e.data;

  postMessage(data);
}, false);

postMessage(true);
