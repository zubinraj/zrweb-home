define(['plugins/http', 'knockout', 'services/logger'], function (http, ko, logger) {

    var msg = ' Please try again or go to the <a href="#">home page</a>.'
    var ctor = {
        title: ko.observable(),
        msg: ko.observable(),
        activate: activate
    }

    return ctor;

    function activate(routeData) {
        if (routeData == '404')
            error404();
        else {
            errorDefault();
        }
    }

    function error404() {
        console.log('404 error');
        ctor.title('Not Found');
        ctor.msg('The resource you are requesting has either moved or is unavailable.' + msg);

    }

    function errorDefault() {
        console.log('default error');
        ctor.title('Error');
        ctor.msg('Oops! Something bad just happened.' + msg );

    }

});