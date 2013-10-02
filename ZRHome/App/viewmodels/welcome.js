define(['plugins/http', 'durandal/app', 'knockout', 'services/logger', 'services/photostream', 'services/blogstream', 'services/common'],
    function (http, app, ko, logger, photostream, blogstream, common) {

    var welcome = {
        title: 'Welcome!',
        developerWidget: {
            title: 'Web Developer',
            description: 'A programmer, primarily developing web applications at work and for fun. I love working on the latest and the greatest frameworks and technologies. Here ae some that have grabbed my fancy recently.',
            thumbUrl: './Content/images/oneszeroes.jpg',
            technologies: [
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
            description: 'A hobbyist photographer, I enjoy taking pictures of birds in their natural surroundings. I\'m joined by my wife Ann Zubin, who is a photography enthusiast herself. Take a look at <a href="#photos">Ann & Zubin Photography</a> and let us know what you think.'
        },
        recentPhotosWidget: {
            title: 'Recent Photos',
            images: photostream.partialStream(),
            footer: '<a href="#photos">more</a>..'
        },
        recentPostsWidget: {
            title: 'Recent Posts',
            items: blogstream.partialStream(),
            footer: '<a href="#blog">more</a>..'
        },
        profileWidget: {
            title: 'Profile',
            items: [
                { item: 'Solution Architect at <a href="http://www.wipro.com">Wipro</a>' },
                { item: 'Passionate about computer programming' },
                { item: 'Love reading books' },
                { item: 'Enjoy outdoor activites' },
                { item: 'Bird photography enthusiast' }

        ]
        },
        activate: activate,
        compositionComplete: compositionComplete
    }

    return welcome;

    function activate () {
        //the router's activator calls this function and waits for it to complete before proceding

        // load blogstream to show blog posts
        blogstream.load(common.blogUrl);

        // load photostream to show thumbnails
        photostream.load(common.photoUrl);

        return;

    }

    function compositionComplete() {

        // initialize lazy load library
        common.initializeLazyLoad();

    }

});

