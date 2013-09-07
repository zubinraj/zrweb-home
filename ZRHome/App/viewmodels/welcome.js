﻿define(['plugins/http', 'durandal/app', 'knockout'], function (http, app, ko) {

    return {
        title: 'Welcome',
        items: ko.observableArray([]),
        activate: function () {
            //the router's activator calls this function and waits for it to complete before proceding

            // Set the data for the carousal
            var item = {
                isactive: 1,
                imagesrc: "http://placehold.it/1200x480",
                caption: "caption 1"
            }

            this.items.push(item);

            var item = {
                isactive: 0,
                imagesrc: "http://placehold.it/1200x480",
                caption: "caption 2"
            }

            this.items.push(item);

            var item = {
                isactive: 0,
                imagesrc: "http://placehold.it/1200x480",
                caption: "caption 3"
            }

            this.items.push(item);

            // activate carousal    
            $('.carousel').carousel({
                interval: 2000
            });

            
        }
    };
});
