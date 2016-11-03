/**
 * Iterates over each link found on a Feedly page emiting its url to +callback+.
 */

var blacklist_urls = "";
var maxlinks = 0;

// console.log(document.cookie);
var feedly_data = extract_feedly_data(document.cookie);
var token = feedly_data.feedlyToken || feedly_data.feedlyRefreshToken;
// console.log("token", token);

/*
self.port.on("blaclist_pref_change", function(blacklist_urls_pref) {
  console.log('blacklist changed to - ' + blacklist_urls_pref);
  blacklist_urls = blacklist_urls_pref;
  self.port.emit("config_loaded");
});
*/

function eachFeedlyUrl(maxlinks, callback) {
  var link_attribute = "data-alternate-link";
  var links = document.querySelectorAll("div[" + link_attribute + "]");
  var numLinksToOpen = maxlinks > 0 ? maxlinks : 10;
  var linksOpened = 0;
  for (var i = 0; i < links.length; i++) {
    if (linksOpened < numLinksToOpen) {
      var link = links[i];
      var entryid = link.getAttribute("data-entryid");
      var url = link.getAttribute(link_attribute);
      if (!isBlackListed(url)) {
        linksOpened++;
      }
      //if (!url.match(/(^http:\/\/www\.thehindu\.com\/news\/national\/(andhra-pradesh|kerala|tamil-nadu|karnataka|telangana)\/.*)/g)) {
      callback(entryid, url);
      //} else {
      //continue;
      //}
    }
  }
}

function isBlackListed(url) {
  var blacklisted_urls = blacklist_urls ? blacklist_urls.split(',') : [];
  var urlIndex = blacklisted_urls.length;
  while (urlIndex--) {
    var bl_url = blacklisted_urls[urlIndex];
    if (url.startsWith(bl_url)) {
      console.info(url + ' matches blacklisted pattern- ' + bl_url);
      return true;
    }
  }
  return false;
}

self.port.on("process_feedly", function(preference) {
  console.info('processing feedly links');
  blacklist_urls = preference.blacklists;
  maxlinks = preference.maxlinks;
  console.info('blacklist option- ' + blacklist_urls);
  console.info('maxlinks option- ' + maxlinks);

  eachFeedlyUrl(maxlinks, function(entryid, url) {
    if (isBlackListed(url)) {
      var data = { token: token, link: {url: url, entryid: entryid} };
      self.port.emit("mark_as_read", data);
    } else {
      self.port.emit("link", { entryid: entryid, url: url });
    }
    /*if (!url.match(/(^http:\/\/www\.thehindu\.com\/news\/national\/(andhra-pradesh|kerala|tamil-nadu|karnataka|telangana|other-states)\/.*)/g)) {
     self.port.emit("link", { entryid: entryid, url: url });
     } else {
     var data = { token: token, link: {url: url, entryid: entryid} };
     self.port.emit("mark_as_read", data);
     }*/
  });
});

function extract_feedly_data(cookie) {
  var regexp = /feedly\.session=(\{.*?\})/;
  var matched = cookie.match(regexp);
  // console.log(matched[1]);
  if (matched) {
    return JSON.parse(matched[1]);
  }
}


self.port.on("tab_closed", function(link) {
  // console.log("tab_closed", token, link);
  var data = { token: token, link: link };
  // console.log("data", data);
  self.port.emit("mark_as_read", data);
});
