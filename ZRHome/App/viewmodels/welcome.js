define(['plugins/http', 'durandal/app', 'knockout', 'services/logger'], function (http, app, ko) {

    var ctor = {
        title: 'Welcome',
        //items: ko.observableArray([]),
        widget1: [{
            title: 'Web Developer',
            description: 'I\'m a programmer, primarily developing web applications at work and for fun. I love working on the latest and the greatest frameworks and technologies. Here ae some that have grabbed my attention recently.',
            thumbUrl: './Content/images/oneszeroes.jpg',
            technologies: [
                { item: 'ASP.Net MVC' },
                { item: 'Durandal JS' },
                { item: 'Knockout JS' },
                { item: 'Single Page Applications' }
            ]
        }],
        widget2: [{
            title: 'Photographer',
            description: 'A hobbyist photographer, I enjoy taking pictures of birds in their natural surroundings. I\'m joined by my wife Ann Zubin, who is a photography enthusiast herself. Take a look at <a>Ann & Zubin Photography</a> and let us know what you think.  '
        }],
        activate: activate
    }

    return ctor;

    function activate () {
        //the router's activator calls this function and waits for it to complete before proceding
          
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

