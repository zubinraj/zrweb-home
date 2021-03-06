﻿define(['durandal/system', 'plugins/router', 'services/logger'], function (system, router, logger) {

    var shell = {
        router: router,
        footer: {
            copyright: 'Copyright © 2010-' + new Date().getFullYear() + ' <a href="http://www.zubinraj.com/">Zubin Raj</a>',
            lines: [
                { line: 'Follow me on <a href="https://github.com/zubinraj/zrweb-home" target="_blank">GitHub</a> | <a href="https://twitter.com/zubinraj" target="_blank">Twitter</a>' },
                { line: 'Powered by <a href="http://weblogs.asp.net/scottgu/archive/2010/07/02/introducing-razor.aspx">Razor.Net</a>, <a href="http://durandaljs.com/" target="_blank">Durandal JS</a>, <a href="http://knockoutjs.com/" target="_blank">Knockout JS</a>, <a href="http://getbootstrap.com/" target="_blank">Bootstrap</a> and <a href="http://isotope.metafizzy.co/" target="_blank">Isotope</a>' }
            ],
            creativeCommons: '<a rel="license" target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="/Content/images/cc_attribution_nocommercial_88x31.png" /></a><br/>Creative Commons Non Commercial'
        },
        activate: activate,
        compositionComplete: compositionComplete
    };

    return shell;

    function activate () {
        logger.log('Welcome!', null, true);

        // Report page transition to analytics client
        router.on('router:navigation:complete', function (instance, instruction, router) {
            if (window._gaq) {
                //logger.log('Analytics is on', null, true);
                window._gaq.push(['_trackPageview', location.pathname + location.search + location.hash]);
            }
        });

        router.on('router:route:not-found', function (fragment) {
            //logger.logError('Page not found', fragment, true);
            router.navigate('#error/404');
        });

        //router.handleInvalidRoute = function (route, params) {
        //    router.navigateTo('#error/404');
        //};

        router.map([
            { route: '', title: 'Welcome', icon: 'glyphicon-home', moduleId: 'viewmodels/welcome', nav: true },
            { route: 'blog', title: 'Blog', icon: 'glyphicon-book', moduleId: 'viewmodels/blog', nav: true },
            { route: 'photos', title: 'Photography', icon: 'glyphicon-camera', moduleId: 'viewmodels/photos', nav: true },
            { route: 'contact', title: 'Contact', icon: 'glyphicon-envelope', moduleId: 'viewmodels/contact', nav: true },
            { route: 'license', title: 'License', icon: '', moduleId: 'viewmodels/license', nav: false },
            { route: 'error', title: 'Error', icon: '', moduleId: 'viewmodels/error', nav: false },
            { route: 'error/:id', title: 'Error', icon: '', moduleId: 'viewmodels/error', nav: false }
        ]).buildNavigationModel();


        return router.activate();

    }
    
    function compositionComplete() {

        // patch to collapse the bootstrap menu after clicked for smaller devices
        $('.nav li a').on('click', function () {
            $('.navbar-collapse').collapse('hide');
        })
    }

});


