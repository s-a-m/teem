'use strict';

var sessionPage = require('./pages/session'),
    registerPage = new sessionPage.Register(),
    loginPage = new sessionPage.Login();

/* https://github.com/angular/protractor/blob/master/docs/toc.md */

describe('Teem', function() {

  describe('1% core user', function() {

    beforeAll(function() {
      browser.get('/communities');
    });

    it('should create a project and share it', function() {
      // If it is not loaded in 10 seconds, we have a problem in mobiles
      // Please do not increase this
      var timeout = 10000,
          community = {
            name: 'Testing Community',
            description: 'Lorem ipsum ad his scripta blandit partiendo, eum fastidii accumsan euripidis in, eum liber hendrerit an.'
          },
          project = {
            title: 'Testing Project',
            pad: 'Blandit incorrupte quaerendum in quo, nibh impedit id vis, vel no nullam semper audiam.'
          };

/*
      var newCommunityButton = element(by.css('.plus'));

      browser.wait(function() {
        if (! newCommunityButton.isDisplayed()) {
          return false;
        }

        // Wait until loading modal ends
        return newCommunityButton.click().then(
          function() { return true; },
          function() { return false; }
        );
      }, timeout);

      registerPage.goToLogin();

      loginPage.login();

      var communityNameInput = by.css('input.title-input');

      browser.wait(function() {
        return browser.isElementPresent(communityNameInput);
      }, timeout);

      element(communityNameInput).sendKeys(community.name);

      element(by.model('community.description')).sendKeys(community.description);

      element(by.css('.new-form-confirm-btn')).click();

      var communityNameEl = by.css('.community-info h1');

      browser.wait(function() {
        return browser.isElementPresent(communityNameEl);
      }, timeout);

      expect(element(communityNameEl).getText()).toBe(community.name.toUpperCase());

      expect(element(by.css('.community-description')).getText()).toBe(community.description);

      element(by.css('.community-project-btn button')).click();

      var projectTitleInput = by.css('input.title-input');

      browser.wait(function() {
        return browser.isElementPresent(projectTitleInput);
      }, timeout);

      element(projectTitleInput).sendKeys(project.title);

      element(by.css('.swellrt-editor')).click();
      element(by.css('.wave-editor-on')).sendKeys(project.pad);

      if (!isDesktop) {
        element(by.css('.pad-check')).click();
        element(by.css('.new-form-confirm-btn')).click();
      }

      var projectTitleEl = by.css('.project-title');

      browser.wait(function() {
        return browser.isElementPresent(projectTitleEl);
      }, timeout);

      expect(element(projectTitleEl).getText()).toBe(project.title);

      expect(element(by.css('#pad ul:first-child')).getText()).toBe(project.pad);

      */
      // Needs
      if(!isDesktop) {
        element(by.css('a.nav-needs')).click();
      }

      var needText = 'More tests';

      element(by.css('.need-name textarea')).sendKeys(needText);
      element(by.css('.need-checkbox-add')).click();

      var needElements = element.all(by.css('.need-item'));

      browser.wait(function() {
        return needElements.count().then(
          function(count) { return count > 1; },
          function() { return false; }
        );
      }, timeout);


      var newNeedElement = needElements.last();

      expect(newNeedElement.element(by.css('.need-name textarea')).getAttribute('value'))
        .toEqual(needText);

      expect(newNeedElement.element(by.css('.checkbox input')).getAttribute('checked'))
        .toBeFalsy();

      // Chat
      if (!isDesktop) {
        element(by.css('a.nav-chat')).click();
      }

      var chatText = 'This is a nice opportunity to discuss about testing';

      element(by.css('.chat-send textarea')).sendKeys(chatText);
      element(by.css('#chatSendBtn')).click();

      var chatMsg = by.css('.chat-message-text');
      browser.wait(function() {
        return browser.isElementPresent(chatMsg);
      }, timeout);

      expect(element(chatMsg).getText())
        .toEqual(chatText);
    });
  });
});
