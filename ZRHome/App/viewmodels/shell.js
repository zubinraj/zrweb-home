define(['durandal/system', 'plugins/router', 'services/logger'], function (system, router, logger) {
    var shell = {
        router: router,
        activate: activate
    };

    return shell;

    function activate () {
        log('Welcome!', null, true);

        router.on('router:route:not-found', function (fragment) {
            logError('Page not found', fragment, true);
        });

        router.map([
            { route: '', title: 'Welcome', icon: 'glyphicon-home', moduleId: 'viewmodels/welcome', nav: true },
            { route: 'blog', title: 'Blog', icon: 'glyphicon-book', moduleId: 'viewmodels/blog', nav: true },
            { route: 'photos', title: 'Photography', icon: 'glyphicon-camera', moduleId: 'viewmodels/photos', nav: true },
            { route: 'contact', title: 'Contact', icon: 'glyphicon-envelope', moduleId: 'viewmodels/contact', nav: true },
            { route: 'error', title: 'Error', icon: '', moduleId: 'viewmodels/error', nav: false }
        ]).buildNavigationModel();


        return router.activate();

    }

    function log(msg, data, showToast) {
        logger.log(msg, data, system.getModuleId(shell), showToast);
    }

    function logError(msg, data, showToast) {
        logger.logError(msg, data, system.getModuleId(shell), showToast);
    }

});


