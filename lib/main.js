var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");
var self = require("sdk/self");
var simeple_prefs = require("sdk/simple-prefs");

require("sdk/preferences/service").set("extensions.sdk.console.logLevel", "all");

var button = buttons.ActionButton({
  id: "one-click-feeds",
  label: "One Click Feeds",
  icon: {
    "16": "./images/One-click-feeds-32X32.png",
    "32": "./images/One-click-feeds-64X64.png",
    "64": "./images/One-click-feeds-64X64.png"
  },
  onClick: function(state) {
    // console.error("click", state);
    var worker = tabs.activeTab.attach({
      contentScriptFile: self.data.url("one-click-feeds.js"),
      contentScriptWhen: "ready"
    });

    worker.port.emit("process_feedly", {
      blacklists : simeple_prefs.prefs['blacklists'],
      maxlinks : simeple_prefs.prefs['maxlinks']
    });

    worker.port.on("link", function(link) {
      tabs.open({
        url: link.url,
        inBackground: true,
        onClose: function(tab) {
          worker.port.emit("tab_closed", link);
        }
      });
    });

    worker.port.on("mark_as_read", function(data) {
      // console.error(data);
      var api = new feedly_api(data.token);
      // console.error(api);
      var client = new feedly_client(api);
      // console.error(client);
      client.mark_as_read([data.link.entryid]);
    });
  }
});

var feedly_api = function(token) {
  var xhr = require("sdk/net/xhr");
  this.token = token;

  this.url = "https://feedly.com/v3/";

  this.request = function(method, settings) {
    var url = this.url + "/" + method;
    var method = settings.method || "GET";
    var request = new xhr.XMLHttpRequest();
    // console.log(method, url);
    request.open(method, url, true);
    // console.log("YO", request, this.token);
    request.setRequestHeader("Authorization", "OAuth " + this.token);
    // console.log("OK");
    request.onreadystatechange = function () {
      if (request.readyState === 4) {
        var json;
        try {
          json = JSON.parse(request.responseText);
        } catch (exception) {
          json = {
            parsingError: exception.message,
            response: request.responseText
          }
        }
        if (request.status === 200) {
          if (typeof settings.onSuccess === "function") {
            settings.onSuccess(json);
          }
        } else if (request.status === 401) {
          if (typeof settings.onAuthorizationRequired === "function") {
            settings.onAuthorizationRequired(settings.accessToken);
          }
        } else if (request.status === 400) {
          if (typeof settings.onError === "function") {
            settings.onError(json);
          }
        }
        if (typeof settings.onComplete === "function") {
          settings.onComplete(json);
        }
      }
    };

    var body;
    if (settings.body) {
      body = JSON.stringify(settings.body);
    }
    request.send(body);
  };
};

var feedly_client = function(api) {
  this.api = api;

  this.mark_as_read = function(ids) {
    this.api.request("markers", {
      method: "POST",
      body: {
        action: "markAsRead",
        type: "entries",
        entryIds: ids
      },
      onSuccess: function(json) {
        // console.log(json);
      }
    });
  };
};
