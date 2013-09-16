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
                { route: '', title: 'Welcome', icon: 'glyphicon-home', moduleId: 'viewmodels/welcome', nav: true },
                { route: 'blog', title: 'Blog', icon: 'glyphicon-book', moduleId: 'viewmodels/blog', nav: true },
                { route: 'photos', title: 'Photography', icon: 'glyphicon-camera', moduleId: 'viewmodels/photos', nav: true },
                { route: 'contact', title: 'Contact', icon: 'glyphicon-envelope', moduleId: 'viewmodels/contact', nav: true }
            ]).buildNavigationModel();
            
            return router.activate();

        }
    };
});