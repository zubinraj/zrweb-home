define(['services/logger'], function (logger) {
    var ctor = {
        title: 'Contact',
        description: 'Any questions?',
        items: [
         { channel: "twitter", address: "@zubinraj" },
         { channel: "email", address: "support @ zubinraj dot com" }
        ],
        activate: activate
    }

    return ctor;

    function activate() {

    }
});