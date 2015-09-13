define(['plugins/http', 'durandal/app', 'knockout', 'services/logger', 'services/photostream', 'services/blogstream', 'services/common'], function (http, app, ko, logger, photostream, blogstream, common) {

    var _blogItems = ko.observableArray([]);
    var _images = ko.observableArray([]);

    var welcome = {
        title: 'Welcome!',
        developerWidget: {
            title: 'Web Developer',
            description: 'A programmer, primarily developing web applications at work and for fun. I love working on the latest and the greatest frameworks and technologies. Here ae some that have grabbed my fancy recently.',
            items: [
                { item: 'ASP.Net MVC' },
                { item: 'Durandal JS' },
                { item: 'Knockout JS' },
                { item: 'Single Page Applications' },
                { item: 'PHP' },
                { item: 'Wordpress Plugins' }
            ]
        },
        photographerWidget: {
            title: 'Photographer',
            description: 'An amateur photographer myself, I\'m joined by my wife, Ann, who is a bird enthusiast. We enjoy taking pictures of birds in their natural surroundings. Take a look at some of our <a href="#photos">photos</a>.',
            items: [
                { item: 'Enjoy outdoor activites' },
                { item: 'Bird photography enthusiast' },
                { item: 'Amateur photographer' }
            ]
        },
        profileWidget: {
            title: 'Profile',
            description: '',
            items: [
                { item: 'Programmer by profession' },
                { item: 'Love reading books' },
                { item: 'Enjoy outdoor activites' },
                { item: 'Bird photography enthusiast' }

            ]
        },
        recentPhotosWidget: {
            title: 'Recent Photos',
            moreLink: '<a href="#photos">see all..</a>',
            items: _images,
            footer: ''
        },
        recentPostsWidget: {
            title: 'Recent Posts',
            moreLink: '<a href="#blog">see all..</a>',
            items: _blogItems,
            footer: ''
        },
        activate: activate,
        compositionComplete: compositionComplete
    };

    return welcome;

    function activate () {
        //the router's activator calls this function and waits for it to complete before proceding

    }

    function compositionComplete() {

        // load data async
        blogstream.load(common.blogUrl, blogdone, blogfail);

        photostream.load(common.photoUrl, photosdone, photosfail);

    }

    function blogdone () {
        //load blogstream to show blog posts
        _blogItems(blogstream.partialStream());

        $("#welcome-blog-loading").hide();
    }

    function photosdone() {
        _images(photostream.partialStream());

        $("#welcome-photos-loading").hide();

        // initialize lazy load library
        common.initializeLazyLoad();

    }

    function blogfail () {
        logger.logError('Data didn\'t load as expected. Please try again.', null, true);

        $("#welcome-blog-loading").hide();
    }

    function photosfail() {
        logger.logError('Data didn\'t load as expected. Please try again.', null, true);

        $("#welcome-photos-loading").hide();
    }

});

