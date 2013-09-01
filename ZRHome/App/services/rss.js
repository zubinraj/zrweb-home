define(function () {
  var rssFeedModel = function (title, link, description, pubDate, author) {
    this.title = title;
    this.link = link;
    this.description = description;
    this.pubDate = pubDate;
    this.author = author;
  };
  var model = {
   loadRssFeeds: load,
  };
  return model;
 
 function load(rssurl, list) {
   return $.get(rssurl, function(data) {
    list.removeAll();  // empty list
    var $xml = $(data);
    $xml.find("item").each(function() {
        var $this = $(this),
            item = {
                title: $this.find("title").text(),
                link: $this.find("link").text(),
                description: $this.find("description").text(),
                pubDate: $this.find("pubDate").text(),
                author: $this.find("author").text()
        }
        //Do something with item here...
		list.push(new rssFeedModel(item.title, item.link, item.description, item.pubDate, item.author));
    });
});

}

});
