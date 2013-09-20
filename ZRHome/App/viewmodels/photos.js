define(['plugins/http', 'knockout', 'services/logger'], function (http, ko, logger) {
    
    var ctor = {
        title: 'Photography',
        images: ko.observableArray([]),
        activate: activate,
        //select: select,
        compositionComplete: compositionComplete
    }

    return ctor;

    function compositionComplete() {
        var $galleryContainer = $("#gallery-container");

        // call relayout on isotope
        $galleryContainer.isotope('reLayout');

        // initialize lazy load
        $("img.lazy").lazyload({
            effect: "fadeIn"
        });

        // initialize fancybox
        $(document).ready(function () {
            $(".fancybox-thumb").fancybox({
                prevEffect: 'none',
                nextEffect: 'none',
                helpers: {
                    title: {
                        type: 'outside'
                    },
                    thumbs: {
                        width: 50,
                        height: 50
                    }
                }
            });
        });

        $("#gallery .filters a").click( function () {

            var selector = $(this).attr("data-filter");
                
            // trigger isotope filter
            $galleryContainer.isotope({ filter: selector });


            // set link color
            $(this).toggleClass("selected");
            $("#gallery .filters a").not(this).removeClass("selected"); //remove the 'selected class from all other elements

            return false;
        });


    }

    function activate() {

        //the router's activator calls this function and waits for it to complete before proceding
        if (this.images().length > 0) {
            return;
        }

        // add custom bindings to handle isotope
        addCustomBindings();


        var that = this;
        return http.get('rss.xml', 'xml').then(function (data) {

            var $xml = $(data);

            $xml.find("item").each(function () {

                var _categories = '';
                var $cat = $(this),
                    _cat = {
                        cat: $cat.find("category").each(function () { _categories += " " + $(this).text().toLowerCase(); })
                    }

                var $thumb = $(this).find("thumb");
                var $original = $(this).find("original");

                var $this = $(this),
                    item = {
                        title: $this.find("title").text(),
                        link: $this.find("link").text(),
                        description: $this.find("description").text(),
                        categories: _categories,
                        pubDate: $this.find("pubDate").text(),
                        author: $this.find("author").text(),
                        thumbUrl: $thumb.text(), 
                        thumbHeight: $thumb.attr("height"),
                        thumbWidth: $thumb.attr("width"),
                        originalUrl: $original.text(),
                        originalHeight: $original.attr("height"),
                        originalWidth: $original.attr("width")
                    }

                that.images.push(item);

            });
        });

    }

    //function select(item) {

    //}

    function addCustomBindings() {

        ko.bindingHandlers.isotope = {
            //init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

            //},
            update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

                var $el = $(element),
                    value = ko.utils.unwrapObservable(valueAccessor());

                if ($el.hasClass('isotope')) {
                    $el.isotope('reLayout');
                } else {
                    $el.isotope({
                        itemSelector: value.itemSelector
                    });
                }
            }

        };

    }

});