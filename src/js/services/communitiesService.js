'use strict';

angular.module('Teem')
  .factory('CommunitiesSvc', [
  'swellRT', '$q', '$timeout', 'base64', 'SessionSvc', 'SwellRTCommon', 'ProjectsSvc',
  'User', '$rootScope', 'Logo', 'Url', 'Participation',
  function(swellRT, $q, $timeout, base64, SessionSvc, SwellRTCommon, ProjectsSvc,
  User, $rootScope, Logo, Url, Participation){

    class CommunityReadOnly extends aggregation(Object, Logo, Url, Participation.ReadOnly) {

      // model is a readOnly object from a SwellRT query result
      constructor (model) {
        // calling "this" is not allowed before super()
        super();

        if (model) {
          for (var k in model.root){
            if (model.root.hasOwnProperty(k)){
              this[k] = model.root[k];
            }
          }
          this._participants = model.participants;
        }
      }

      get pathPrefix () { return '/communities/'; }

      nameForPotTag () {
        if (! this.name ) {
          return '';
        }

        var wordLength = 14,
            lines = [[], []],
            tagLength = wordLength * lines.length + lines.length,
            words = this.name.split(' '),
            shorterName;

        // Short words that are longer than lineLength
        angular.forEach(words, function(word, index) {
          if (word.length > wordLength) {
            words[index] = word.substring(0, wordLength - 3) + '...';
          }
        });

        shorterName = words.join(' ');

        // Change '...' at the end of last word if required
        if (shorterName.length > tagLength &&
            shorterName.charAt(tagLength - 1 !== ' ') &&
            shorterName.charAt(tagLength - 2 !== ' ')) {

          let lastWord = words.pop();

          if (lastWord.length > 3) {
            lastWord = lastWord.substring(0, lastWord.length - 3) + '...';

            words.push(lastWord);
          }
        }

        // Add <br> in the middle of the name to break it in two lines
        lines[0].push(words.shift());

        while (words.length) {
          if (lines[0].join(' ').length <= lines[1].join(' ').length) {
            lines[0].push(words.shift());
          } else {
            lines[1].unshift(words.pop());
          }
        }

        return lines[0].join(' ') + (
          lines[1].length ?
            '<br />' + lines[1].join(' ') :
            '');
      }

      myAndPublicProjects () {
        return ProjectsSvc.all({
           community: this.id
         });
      }
    }

    class Community extends aggregation(CommunityReadOnly, Participation.ReadWrite) {

      delete () {
        this.type = 'deleted';

        //TODO remove pointers from project.communities
      }
    }

    // Service functions

    var openedCommunities = {};

    $rootScope.$on('swellrt.prepare-logout', function(){
      angular.forEach(openedCommunities, function(value, key){
        SwellRT.closeModel(key);
      });

      openedCommunities = {};
      $timeout();
    });


    var find = function(id) {
      var comDef = $q.defer();
      var community = comDef.promise;

      if (!openedCommunities[id]) {
        openedCommunities[id] = community;

        SwellRT.openModel(id, function(model){

          $timeout(function(){
            var pr = swellRT.proxy(model, Community);

            comDef.resolve(pr);
          });

        }, function(error){

          console.log(error);

          comDef.reject(error);
        });
      } else {
        openedCommunities[id].then(
          function(r){
            comDef.resolve(r);
          });
      }

      return community;
    };

    function findByUrlId(urlId) {
      return find(base64.urldecode(urlId));
    }

    var create = function(data, callback) {
      var d = $q.defer();
      var id = window.SwellRT.createModel(function(model){
        openedCommunities[id] = d.promise;
        SwellRTCommon.makeModelPublic(model);

        var p;

        $timeout(function(){
          p = swellRT.proxy(model, Community);
        });

        $timeout(function(){
          p.type = 'community';
          p.id = id;
          p.projects = [];
          d.resolve(p);
        });
      });

      d.promise.then(callback);

      return d.promise;
    };

    /*
     * Count the projects these communities have
     * FIXME: Use ProjectsSvc for this
     */
    function countProjects (communities) {

      return $q(function (resolve, reject) {

        SwellRT.query(
          {_aggregate:
             [{$match: {
               'root.type': 'project',
               'root.shareMode': 'public',
               'root.communities': { $in: communities.map(c => c.id) }
             }},
              {$unwind: '$root.communities'},
              {$group :
               {_id:'$root.communities',
                number: { $sum : 1 }
               }
              }]},
            function(result){
              var counters = result.result;

              angular.forEach(communities, function (c) {
                angular.forEach(counters, function (cnt) {
                  if (c.id === cnt._id) {
                    c.numProjects = cnt.number;
                  }
                });

                if (c.numProjects === undefined) {
                  c.numProjects = 0;
                }
              });

              resolve();
            },
            function(e){
              reject(e);
            });
      });
    }

    /*
     * Build options for all query
     */
    function buildAllQuery(options) {
      var query = {
        _aggregate: [
          {
            $match: {
              'root.type': 'community'
            }
          }
        ]
      };

      if (options.ids) {
        query._aggregate[0].$match['root.id'] = { $in: options.ids };
      }

      if (options.participant) {
        query._aggregate[0].$match.participants = options.participant;
      }

      return query;
    }

    /*
     * Find all the communities that meet some condition
     */
    function all (options = {}) {
      var communities = [],
          query = buildAllQuery(options);

      return $q(function(resolve, reject) {

        SwellRT.query(query, function(result) {
            angular.forEach(result.result, function(c) {
              communities.push(new CommunityReadOnly(c));
            });

            if (options.projectCount) {
              countProjects(communities)
                .then(function () {
                  resolve(communities);
                }, function (error) {
                  reject(error);
                });
            } else {
              resolve(communities);
            }
          },
          function(e){
            reject(e);
          }
        );
      });
    }

    // The communities the user is participating in
    var participating = function(options = {}) {
      if (!SessionSvc.users.loggedIn()) {
        return $q(function(resolve) {
          resolve([]);
        });
      }

      options.participant = SessionSvc.users.current();

      return all(options);
    };

    // List of community menbers and contributors of communities teems
    // for the communities with id in the ids array
    var communitiesContributors = function (ids) {

      if (ids === undefined || ids === []){
        return $q(function(resolve) {
          resolve([]);
        });
      }
      if (typeof ids === String){
        ids = [ids];
      }

      var query = {
        _aggregate: [
          {$match: {
            'root.type': {$in: ['project','community']},
            'root.shareMode': 'public',
            'root.communities': {$in: ids}
          }},

          {$unwind: '$participants'},
          {$group :
            {_id:'$participants'}
          }
        ]};

        var def = $q.defer();

        SwellRT.query(query, function(a){
          def.resolve(a.result);
        }, function(error){
          def.reject(error);
        });

        return def.promise;
      };

    return {
      findByUrlId,
      find,
      create,
      all,
      participating,
      communitiesContributors,
      CommunityReadOnly
    };
  }]);
