define(['plugins/http', 'durandal/app', 'knockout'], function (http, app, ko) {
    //Note: This module exports an object.
    //That means that every module that "requires" it will get the same object instance.
    //If you wish to be able to create multiple instances, instead export a function.
    //See the "welcome" module for an example of function export.

    var ctor = function () {
        
        console.log('initializing ctor');

        this.title = 'My Photography';
        this.images = ko.observableArray([]);

        return {
            title: this.title,
            images: this.images,
            activate: activate,
            select: select,
            //compositionComplete: compositionComplete
        }

        //function compositionComplete() {
        //    var $container = $("#gallery-container");

        //    // call relayout on isotope
        //    $container.isotope('reLayout');

        //}

        function activate() {

            //the router's activator calls this function and waits for it to complete before proceding
            if (this.images().length > 0) {
                return;
            }

            // add custom bindings to handle isotope
            //addCustomBindings();


            var that = this;
            return http.get('rss.xml', 'xml').then(function (data) {

                var $xml = $(data);

                $xml.find("item").each(function () {

                    var _categories = '';
                    var $cat = $(this),
                        _cat = {
                            cat: $cat.find("category").each(function () { _categories += " " + $(this).text(); })
                        }

                    var $this = $(this),
                        item = {
                            title: $this.find("title").text(),
                            link: $this.find("link").text(),
                            description: $this.find("description").text(),
                            categories: _categories,
                            pubDate: $this.find("pubDate").text(),
                            author: $this.find("author").text(),
                            thumbnail: "http://placehold.it/300x200" //$this.find("thumbnail").text()
                        }

                    that.images.push(item);

                });
            })

        }

        function select(item) {

        }

        //function addCustomBindings() {

        //    ko.bindingHandlers.isotope = {
        //        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        //        },
        //        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        //            var $el = $(element),
        //                value = ko.utils.unwrapObservable(valueAccessor());

        //            if ($el.hasClass('isotope')) {
        //                $el.isotope('reLayout');
        //            } else {
        //                $el.isotope({
        //                    itemSelector: value.itemSelector
        //                });
        //            }
        //        }

        //    };

        //};


    }();

    //console.log('creating new instance');
    //var instance = new ctor();

    //console.log('before binding');
    //ko.applyBindings(ctor);
    //console.log('after binding');

    //console.log('return instance');
    return ctor;


});