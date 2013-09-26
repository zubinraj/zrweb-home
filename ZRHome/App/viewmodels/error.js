define(['plugins/http', 'knockout', 'services/logger'], function (http, ko, logger) {

    //var _title = ko.observable();
    //var _msg = ko.observable();

    return {
        //title: 'Page Not Found',
        //msg: 'You may have followed a link which is outdated or incorrect. Or we may have screwed up, these things happen.',
        activate: activate
    };

    function activate(routeData) {

        //if (routeData == '404') {
        //    _title = 'Page Not Found';
        //    _msg = 'You may have followed a link which is outdated or incorrect. Or we may have screwed up, these things happen.';
        //}
    }

});