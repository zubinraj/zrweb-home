define(['plugins/http', 'durandal/app', 'knockout'], function (http, app, ko) {

    var ctor = function () {

        var title = 'Blog';
        var items = ko.observableArray([]);

        return {
            title: title,
            items: items,
            activate: activate,
            compositionComplete: compositionComplete
        }

        function compositionComplete() {
            var $blogContainer = $("#blog-container");

            // call relayout on isotope
            $blogContainer.isotope('reLayout');


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

        function activate () {
            //the router's activator calls this function and waits for it to complete before proceding
            if (this.items().length > 0) {   
                return;
            }

            var that = this;
            return http.get('rss_b.xml').then(function (data) {

                var $xml = $(data);


                $xml.find("item").each(function () {

                    var _categories = '';
                    var $cat = $(this),
                        _cat = {
                            cat: $cat.find("category").each(function () { _categories += " " + $(this).text().toLowerCase(); })
                        }

                    var $this = $(this),
                        item = {
                            title: $this.find("title").text(),
                            link: $this.find("link").text(),
                            description: $this.find("description").text(),
                            pubDate: $this.find("pubDate").text(),
                            author: $this.find("author").text(),
                            categories: _categories
                        }

                    that.items.push(item);

                });
            })
        }

    }();

    return ctor;

});