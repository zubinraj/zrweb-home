define(['durandal/system', 'durandal/plugins/router', 'services/logger'],
    function (system, router, logger) {
        var shell = {
            activate: activate,
            router: router
        };
        
        return shell;

        //#region Internal Methods
        function activate() {
            return boot();
        }

        function boot() {
            router.mapNav('home');
            //router.mapNav('details');
            //router.mapNav('projects');
            //router.mapNav('tweets');
            router.mapNav('blog');
            router.mapNav('photography');
            router.mapNav('contact');
            log('Welcome!', null, true);
            return router.activate('about');
        }

        function log(msg, data, showToast) {
            logger.log(msg, data, system.getModuleId(shell), showToast);
        }
        //#endregion
    });