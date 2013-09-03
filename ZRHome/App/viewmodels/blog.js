define(['plugins/http', 'durandal/app', 'knockout'], function (http, app, ko) {
    return {
        title: 'Blog',
        items: ko.observableArray([]),
        activate: function () {
            //the router's activator calls this function and waits for it to complete before proceding
            if (this.items().length > 0) {   
                return;
            }

            var that = this;
            return http.get('/rss.xml').then(function (data) {

                var $xml = $(data);

                //alert($xml);

                $xml.find("item").each(function () {

                    var $this = $(this),
                        item = {
                            title: $this.find("title").text(),
                            link: $this.find("link").text(),
                            description: $this.find("description").text(),
                            pubDate: $this.find("pubDate").text(),
                            author: $this.find("author").text()
                        }

                    that.items.push(item);

                });
            })
        }//,
        //select: function (item) {
        //    //the app model allows easy display of modal dialogs by passing a view model
        //    //views are usually located by convention, but you an specify it as well with viewUrl
        //    item.viewUrl = 'views/detail';
        //    app.showDialog(item);
        //}//,
        //canDeactivate: function () {
        //    //the router's activator calls this function to see if it can leave the screen
        //    return app.showMessage('Are you sure you want to leave this page?', 'Navigate', ['Yes', 'No']);
        //}
    };
});