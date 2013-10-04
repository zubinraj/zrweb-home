﻿define(['durandal/system', 'durandal/app', 'knockout', 'services/logger'],
    function (system, app, ko, logger) {

        var _stream = ko.observableArray([]);

        var _partialStream = ko.observableArray([]);

        return {
            stream: _stream,
            partialStream: _partialStream,
            load: _load
        };

        //return photostream;



        function _load(url) {

            // check if already loaded
            if (_stream().length > 0) {
                return;
            }

            // clear
            _stream.removeAll();
            _partialStream.removeAll();

            // load
            $.ajax(url)
            .done(_success)
            .fail();

            function _success (data) {

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

                    _stream().push(item);

                });

                console.log('Photos: Stream count: ' + _stream().length);

                // copy few elements to partial stream
                for (var i = 0; (i < 3) && (i < _stream().length); i++) {
                    _partialStream().push(_stream()[i]);
                }
                console.log('Photos: Partial stream count: ' + _partialStream().length);

                return true;

            }
            
        }

    });