define(['plugins/http', 'durandal/app', 'knockout', 'services/logger', 'services/photostream', 'services/blogstream'],
    function (http, app, ko, logger, photostream, blogstream) {

    var ctor = {
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
        activate: activate,
        compositionComplete: compositionComplete
    }

    return ctor;

    function activate () {
        //the router's activator calls this function and waits for it to complete before proceding

        // load photostream to show thumbnails
        photostream.load('rss.xml');

        blogstream.load('rss_b.xml');

        return;

    }

    function compositionComplete() {

        // initialize lazy load
        $("img.lazy").lazyload({
            effect: "fadeIn"
        });

    }

    function initializeCarousal() {

        // Set the data for the carousal
        //var item = {
        //    isactive: 1,
        //    imagesrc: "http://placehold.it/1200x400",
        //    caption: "caption 1"
        //}

        //this.items.push(item);

        //var item = {
        //    isactive: 0,
        //    imagesrc: "http://placehold.it/1200x400",
        //    caption: "caption 2"
        //}

        //this.items.push(item);

        //var item = {
        //    isactive: 0,
        //    imagesrc: "http://placehold.it/1200x400",
        //    caption: "caption 3"
        //}

        //this.items.push(item);

        //// activate carousal    
        //$('.carousel').carousel({
        //    interval: 2000
        //});
    }

});

