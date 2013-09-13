define(['plugins/http', 'durandal/app', 'knockout'], function (http, app, ko) {
    //Note: This module exports an object.
    //That means that every module that "requires" it will get the same object instance.
    //If you wish to be able to create multiple instances, instead export a function.
    //See the "welcome" module for an example of function export.

    return {
        title: 'My Photography',
        images: ko.observableArray([]),
        activate: function () {
            //the router's activator calls this function and waits for it to complete before proceding
            if (this.images().length > 0) {
                return;
            }

            var that = this;
            return http.get('rss.xml', 'xml').then(function (data) {

                var $xml = $(data);

                //alert($xml);

                $xml.find("item").each(function () {

                    var _categories = '';
                    var $cat = $(this),
                        _cat = {
                            cat: $cat.find("category").each(function () { _categories += " " + $(this).text(); })
                        }
                    //console.log(_categories);

                    var $this = $(this),
                        item = {
                            title: $this.find("title").text(),
                            link: $this.find("link").text(),
                            description: $this.find("description").text(),
                            categories: _categories,
                                //.each(function ()
                                //{ parent.categories += " " + $(this).text(); }),
                            pubDate: $this.find("pubDate").text(),
                            author: $this.find("author").text(),
                            thumbnail: "http://placehold.it/300x200" //$this.find("thumbnail").text()
                        }

                    console.log(item.categories);

                    that.images.push(item);

                });
            })

        },
        select: function(item) {
            //the app model allows easy display of modal dialogs by passing a view model
            //views are usually located by convention, but you an specify it as well with viewUrl
            item.viewUrl = 'views/detail';
            app.showDialog(item);
        }//,
        //canDeactivate: function () {
        //    //the router's activator calls this function to see if it can leave the screen
        //    return app.showMessage('Are you sure you want to leave this page?', 'Navigate', ['Yes', 'No']);
        //}
    };
});