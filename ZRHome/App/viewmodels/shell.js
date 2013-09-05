define(['plugins/router', 'durandal/app'], function (router, app) {
    return {
        router: router,
        search: function() {
            //It's really easy to show a message box.
            //You can add custom options too. Also, it returns a promise for the user's response.
            app.showMessage('Search not yet implemented...');
        },
        activate: function () {
            router.map([
                { route: '', title:'About', moduleId: 'viewmodels/about', nav: true },
                { route: 'welcome', title: 'Welcome', moduleId: 'viewmodels/welcome', nav: true },
                { route: 'photos', title: 'Photography', moduleId: 'viewmodels/photos', nav: true },
                { route: 'blog', title: 'Blog', moduleId: 'viewmodels/blog', nav: true }
            ]).buildNavigationModel();
            
            return router.activate();

        }
    };
});