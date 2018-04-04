self.addEventListener('message', function(e) {
  let data = e.data;

  setTimeout(function() {
    postMessage(data);
  }, 100);
}, false);

postMessage(true);
