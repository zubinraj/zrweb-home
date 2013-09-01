define(['services/logger', 'services/rss'], function (logger, rss) {
    var vm = {
        activate: activate,
        title: "Zubin's Web Log",
        rssitems: ko.observableArray([])
    };
    return vm;

    function activate() {
        //alert(vm.rssitems().length);
        rss.loadRssFeeds("http://localhost/zrhome/rss.xml", vm.rssitems);
        //alert(vm.rssitems().length);
        //logger.log("Rss page activated", null, 'blogfeed', true);
        return true;
    }
});