/* jshint node:true*/
module.exports = {
  framework: 'qunit',
  test_page: 'tests/index.html?hidepassed',
  disable_watching: true,
  browser_start_timeout: 180,
  browser_args: {
    Chrome: [
      '--no-sandbox', '--headless', '--disable-gpu', '--remote-debugging-port=9222'
    ]
  },
  launch_in_ci: [
    'Chrome'
  ],
  launch_in_dev: [
    'Chrome'
  ]
};
