define(['services/logger', 'services/rss'], function (logger, rss) {
    var vm = {
        activate: activate,
        title: "Photography",
        rssitems: ko.observableArray([])
    };
    return vm;

    function activate() {
        //alert('activate');
        rss.loadRssFeeds("http://localhost/zrhome/rss.xml", vm.rssitems);
        //logger.log("Rss page activated", null, 'blogfeed', true);
        return true;
    }
});