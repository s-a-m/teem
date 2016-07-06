'use strict';

var gulpConfig = require(__dirname + '/../gulpfile').config;

var sessionPages = require(__dirname + '/e2e/pages/session'),
    communityPages = require(__dirname + '/e2e/pages/community')

exports.config = {
  allScriptsTimeout: 90000,

  // Sometimes Selenium Webdriver gets stuck, and directly connecting to browsers work
  directConnect: true,

  specs: [
    'e2e/**/*.js'
  ],

  multiCapabilities: [{
   'browserName': 'chrome',
   'chromeOptions' : {
       args: ['--lang=en',
              '--window-size=1024,800']
     },
   }, {
   'browserName': 'chrome',
   'chromeOptions' : {
    args: ['--lang=en',
           '--window-size=350,650']
     },
  }],

  baseUrl: 'http://' + gulpConfig.serverTest.host + ':' + gulpConfig.serverTest.port + '/',

  framework: 'jasmine2',

  jasmineNodeOpts: {
    defaultTimeoutInterval: 90000
  },

  suites: {
    session: 'e2e/session.js',
    frontpage: 'e2e/frontpage.js',
    core: 'e2e/core/*.js'
  },

  onPrepare: function() {
    var registerPage = new sessionPages.Register(),
        loginPage = new sessionPages.Login(),
        newCommunityPage = new communityPages.NewCommunityPage();

    registerPage.get();
    registerPage.register();

    loginPage.get();
    loginPage.login();

    newCommunityPage.get();
    newCommunityPage.create();

    browser.getCurrentUrl().then((url) => {
      global.communityUrl = url;
    });

    return browser.driver.executeScript('return window.innerWidth >= 992;').then((desktop) => {
      global.isDesktop = desktop;
    });
  }
};
