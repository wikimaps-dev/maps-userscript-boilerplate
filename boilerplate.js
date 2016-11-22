mw.loader.using(['jquery.ui.dialog'], function() {
  // stuff should only happen in the File namespace
  if (mw.config.values.wgCanonicalNamespace === 'File') {
    // use the Mediawiki API to check for the use of Template:Map on this page
    $.ajax({
      url: 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=templates&redirects=1&tllimit=100&pageids=' + mw.config.values.wgArticleId,
      success: function(result) {
        var templates = result.query.pages[mw.config.values.wgArticleId].templates;
        for (var key in templates) {
          if (templates[key].title === 'Template:Map') {
            // the Map template exists and the Warper client code can be internalized
            warper.Init()
            // obtain map data from the Warper
            warper.getMapFromPageId(mw.config.values.wgArticleId, function(mapData) {
              if (mapData) {
                // do whatever you want with the returned data
              } else {
                /*
                You could trigger auth and create the map here, but it's recommended that you in someway inform 
                the user of the actions and also clarifies that the actions preformed will be done by a bot.

                warper.createMap(mw.config.values.wgArticleId, mw.config.values.wgTitle, function(mapData) {
                  // now you can work with this data too
                });
                */
              }
            });
            break;
          }
        }
      }
    });
  }

  var warper = {
    domain: 'https://warper.wmflabs.org',
    commons: 'https://commons.wikimedia.org',
    token: undefined,
    user: undefined,

    Init: function() {
      if (localStorage.getItem('warperToken') != null && localStorage.getItem('warperUser') != null) {
        warper.token = localStorage.getItem('warperToken');
        warper.user = localStorage.getItem('warperUser');
        // check if the token is valid, if not it will be removed
        warper.validateToken();
      }
    },

    getMapFromPageId: function(pageId, callback) {
      $.ajax({
        url: warper.domain + '/api/v1/maps?field=page_id&query=' + pageId,
        success: function(result) {
          if (!result.data.length <= 0) {
            typeof callback === 'function' && callback(result);
          } else {
            typeof callback === 'function' && callback(false);
          }
        }
      });
    },

    createMap: function(pageId, title, callback) {
      var action = function() {
        $.ajax({
          url: warper.domain + '/api/v1/maps',
          type: 'POST',
          headers: {
            'X-User-Token': warper.token,
            'X-User-Id': warper.user
          },
          data: '{"data": {"type": "maps","attributes": {"page_id":"' + pageId + '","title": "' + title + '"}}}',
          success: function(result) {
            typeof callback === 'function' && callback(result);
          },
          error: function(result) {
            typeof callback === 'function' && callback(false);
          }
        });
      }

      if (warper.token) {
        action();
      } else {
        warper.getToken(function() {
          action();
        });
      }
    },
    
    getToken: function(callback) {
      // create popup window
      //?omniauth_window_type=newWindow&auth_origin_url=' + window.location.href
      var myPopup = window.open(warper.domain + '/u/auth/mediawiki?auth_origin_url=' + window.location.href, 'myWindow');

      // periodical message sender
      var messenger = setInterval(function() {
        var message = 'requestCredentials';
        // send the message and target URI
        myPopup.postMessage(message, warper.domain);
      }, 500);

      // listen to response
      window.addEventListener('message', function(event) {
        // the message listener gets triggered by any URL make sure it's the right one
        if (event.origin !== warper.domain) return;
        clearInterval(messenger);
        localStorage.setItem('warperToken', event.data.auth_token);
        localStorage.setItem('warperUser', event.data.id);
        wraper.token = event.data.auth_token;
        wraper.user = event.data.id;
        typeof callback === 'function' && callback(event.data);
      }, false);
    },

    validateToken: function(callback) {
      $.ajax({
        url: warper.domain + '/api/v1/auth/validate_token.json?user_id=' + warper.user + '&user_token=' + warper.token,
        success: function(result) {
          // check if the token returned matches the stored one
          if (warper.token === result.meta.auth_token) {
            typeof callback === 'function' && callback(true);
          } else {
            warper.token = undefined;
            warper.user = undefined;
            localStorage.removeItem('warperToken');
            localStorage.removeItem('warperUser');
            typeof callback === 'function' && callback(false);
          }
        }
      });
    }
  }
});