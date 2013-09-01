define(['services/logger', 'services/rss'], function (logger, rss) {
    var vm = {
        activate: activate,
        title: "Contact",
        twitter: "@zubinraj"
    };
    return vm;

    function activate() {
        //logger.log("Rss page activated", null, 'blogfeed', true);
        return true;
    }
});