define(['plugins/http', 'knockout', 'services/logger', 'services/blogstream', 'services/common'], function (http, ko, logger, blogstream, common) {

    var _items = ko.observableArray([]);

    var blog = {
        title: 'Zubin\'s Web Log',
        items: _items,  
        compositionComplete: compositionComplete
    };

    return blog;

    function compositionComplete() {


        // add custom bindings to handle isotope
        addCustomBindings();

        //$.when(
        //    // load the blog
        //    blogstream.load(common.blogUrl)
        //)
        //.then(function () {
        //    _items(blogstream.stream());

        //})
        //.always(function() {
        //    $("#blog-loading").hide();

        //});

        blogstream.load(common.blogUrl, done, fail);


        var $blogContainer = $("#blog-container");

        $("#blog .filters a").click( function () {

            var selector = $(this).attr("data-filter");
                
            // trigger isotope filter
            $blogContainer.isotope({ filter: selector });

            // set link color
            $(this).toggleClass("selected");
            $("#blog .filters a").not(this).removeClass("selected"); //remove the 'selected class from all other elements

            return false;
        });

    }

    function done() {
        //logger.log('Data loaded, Yo!', null, true);

        _items(blogstream.stream());

        $("#blog-loading").hide();

    }

    function fail() {
        logger.logError('Data didn\'t load as expected. Please try again.', null, true);

        $("#blog-loading").hide();
    }

    function addCustomBindings() {

        ko.bindingHandlers.isotope = {
            init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

            },
            update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

                var $el = $(element);
                var value = ko.utils.unwrapObservable(valueAccessor());

                var $container = $(value.container);

                $container.isotope({
                    itemSelector: value.itemSelector
                });

                $container.isotope('appended', $el);

            }

        };

    }



});