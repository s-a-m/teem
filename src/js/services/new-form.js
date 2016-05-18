'use strict';

angular.module('Teem')
  .factory('NewForm', [
  '$location', '$window', '$rootScope',
  function($location, $window, $rootScope) {
    var scope,
        objectName,
        scopeFn = {
          isNew () {
            return $location.search().form === 'new';
          },
          cancelNew () {
            scope[objectName].delete();

            $location.search('form', undefined);

            $window.history.back();
          },
          confirmNew () {
            $location.search('form', undefined);

            var emails = [];

            scope.invite.selected.forEach(function(i){

              var value = JSON.parse(i);
              // if it is an email address
              if (typeof value === 'object' && value.email) {
                emails.push(value.email);
              }
              // if it is an existing user
              else {
                scope[objectName].addParticipant(i);
              }

            });

            SwellRT.invite(emails, scope.linkCurrentProject(), scope.project.title);

            $rootScope.$broadcast('teem.' + objectName + '.join');
          }
        };

    function initialize(s, o) {
      scope = s;
      objectName = o;

      scope.newFormObjectName = o;
      Object.assign(scope, scopeFn);
    }

    return {
      initialize
    };
  }]);
