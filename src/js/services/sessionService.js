'use strict';

/**
 * @ngdoc function
 * @name Teem.service:SessionSvc
 * @description
 * # SessionSvc service
 * Provides an API to handle SwellRT sessions and network events
 */

angular.module('Teem')
  .factory('SessionSvc', [
    // NotificationSvc has to be added here as dependency to be loaded in the app
  '$q', '$timeout', 'SharedState', 'NotificationSvc', '$locale', 'User',
  '$rootScope',
  function($q, $timeout, SharedState, NotificationSvc, $locale, User,
           $rootScope) {

    var swellRTDef = $q.defer(),
        swellRTpromise = swellRTDef.promise,
        sessionDef,
        sessionPromise,
        // TODO no restart session without user saying so
        // TODO stop session before start session after a timeout
        // TODO if reconnected, get again all objects
        status = {
          // Connection status:
          // notConnected: connection has not been atempted
          // connecting: establishing connection
          // connected: everything alright!
          // disconnected: something bad happened
          connection: 'notConnected',
          sync: true,
        };

    var autoStartSession;

    SwellRT.ready(function() {
      swellRTDef.resolve();
    });

    swellRTpromise.then(function(){
      SwellRT.on(SwellRT.events.NETWORK_CONNECTED, function(){
        $rootScope.$broadcast('swellrt.prepare-login');
        status.connection = 'connected';
        $timeout();
        if (User.loggedIn()){
          $rootScope.$broadcast('teem.login');
        }
      });

      SwellRT.on(SwellRT.events.NETWORK_DISCONNECTED, function(){
        $timeout(function(){
          status.connection = 'disconnected';
        });
      });

      SwellRT.on(SwellRT.events.DATA_STATUS_CHANGED, function(data){
        if (data.inFlightSize === 0 &&
            data.uncommittedSize === 0 &&
            data.unacknowledgedSize  === 0) {

          status.sync = true;
          status.lastSync = new Date();
          $timeout();
        } else {
          status.sync = false;
          $timeout();
        }
      });

      SwellRT.on(SwellRT.events.FATAL_EXCEPTION, function(){
        $timeout(function(){
          status.connection = 'disconnected';
        });
      });
    });

    function sessionPromiseInit () {
      sessionDef = $q.defer();
      sessionPromise = sessionDef.promise;

      sessionPromise.catch(function (error) {
        console.log(error);

        $timeout(function(){
          status.connection = 'disconnected';
        });
      });
    }

    sessionPromiseInit();

    var users = {
      password: '$password$',
      callbacks: {
        login: [],
        logout: []
      },
      current: function() {
        // console.log('Deprecated. Use User.currentId() instead');

        return User.currentId();
      },

      currentNick: function() {

        if (User.loggedIn()){
          // console.log('Deprecated. Use User.current().nick instead');

          return User.current().nick;
        }

        return undefined;
      },

      isCurrent: function(user) {
        // console.log('Deprecated. Use User.isCurrent() instead');

        return User.isCurrent(user);
      },
      loggedIn: function() {
        // console.log('Deprecated. Use User.loggedIn() instead');

        return User.loggedIn();
      }
    };

    var registerUser = function(userName, password, email, onSuccess, onError) {
      swellRTpromise.then(function(){
        var data = {
          id: userName,
          password: password,
          email: email,
          locale: $locale.id
        };
        SwellRT.createUser(data, function(res){
          if (res.error) {
            onError(res.error);

          } else if (res.data) {
            onSuccess();

          }
        });
      });
    };

    var stopSession = function(){
      swellRTpromise.then(function(){

        $rootScope.$broadcast('swellrt.prepare-logout');
        $timeout();
        SwellRT.stopSession();
        $rootScope.$broadcast('teem.logout');

        sessionPromiseInit();

        SwellRT.startSession(SwellRTConfig.server, SwellRT.user.ANONYMOUS,  '',
          function(){
            sessionDef.resolve(SwellRT);
          }, function(error) {
            console.log(error);
          });

      });
    };

    // check variable connecting before calling startSession
    var startSession = function(userName, password, onSuccess, onError) {

      swellRTpromise.then(function(){
        if (status.connection === 'connected') {
          if (userName && __session.address &&
              __session.address === userName) {
            return; // Session already started
          } else {
            $rootScope.$broadcast('swellrt.prepare-logout');
            $timeout();
            SwellRT.stopSession();
            $rootScope.$broadcast('teem.logout');
          }
        }


        status.connection = 'connecting';

        SwellRT.startSession(SwellRTConfig.server, userName || SwellRT.user.ANONYMOUS,  password || '',
          function(){
            sessionDef.resolve(SwellRT);
            onSuccess();

          }, function(error) {
            autoStartSession();
            onError(error);
          });
      });
    };

    var forgottenPassword = function(email, recoverUrl, onSuccess, onError) {
      SwellRT.recoverPassword(email, recoverUrl, onSuccess, onError);
    };

    var recoverPassword = function(id, tokenOrPassword, password, onSuccess, onError) {
      SwellRT.setPassword(id, tokenOrPassword, password, onSuccess, onError);
    };

    function getUserProfile(data, cb) {
      sessionPromise.then(function() {
        SwellRT.getUserProfile(data, cb);
      });
    }

    var updateUserProfile = function(data, cb) {
      sessionPromise.then(function(){
        SwellRT.updateUserProfile(data, cb);
      });
    };

    autoStartSession = function(){

      status.connection = 'connecting';

      var user, pass;

      try {
        user = localStorage.getItem('userId');
      } catch(e) {
      }

      // remove this after passwordless user migration is done
      if (user) {
        pass = users.password;

        // remove this start session call with default password when passwordless user migration is consideded successful
        // keep SwellRT.resumeSession call
        startSession(
          user, pass, function(){
            // migrating users with default password
            if (user !== undefined) {
              SharedState.set('modalSharedState', {name: 'session', type: 'migration'});
              $timeout();
            }
          },
          // with localStorage.userId but not default password
          function(error) {
            console.log(error);
            delete localStorage.userId;
            autoStartSession();
          });
      } else {
        swellRTpromise.then(function(){
          SwellRT.resumeSession(function(){

              sessionDef.resolve(SwellRT);
            },
            function(error){
              console.log(error);
              // Anonymous session (user and pass are null)
              startSession(
                user, pass, function(){},
                function(error) {
                  console.log(error);
                });
            });
          });
      }
    };

    function loginRequired(scope, cb, options = {}) {

      sessionPromise.then(function() {

        if (! users.loggedIn()) {

          let state = {
            name: 'session',
            type: options.form || 'login',
            message: options.message
          };

          SharedState.set('modalSharedState', state);

          // Invoque $timout to refresh scope and actually show modal
          $timeout();

          scope.$on('teem.login', cb);
        } else {
          cb();
        }
      });

    }

    return {
      users: users,
      registerUser: registerUser,
      startSession: startSession,
      stopSession: stopSession,
      recoverPassword: recoverPassword,
      forgottenPassword: forgottenPassword,
      getUserProfile: getUserProfile,
      updateUserProfile: updateUserProfile,
      loginRequired: loginRequired,
      status: status,
      // TODO refactor with Prototype version of proxy objects to avoid the use of onLoad
      onLoad: function(f) {
        if (status.connection === 'notConnected' ||
            status.connection === 'disconnected'){
          autoStartSession();
        }

        sessionPromise.then(f);
        return sessionPromise;
      }
    };
  }]);
