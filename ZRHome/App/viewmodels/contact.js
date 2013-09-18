define(['services/logger'], function (logger) {
    var ctor = {
        title: 'Contact',
        contactHeading: 'Any questions?',
        contactItems: [
            { channel: 'email', text: 'support @ zubinraj dot com', url: '' },
            { channel: 'twitter', text: '@zubinraj', url: 'https://twitter.com/zubinraj' },
            { channel: 'github', text: 'https://github.com/zubinraj/', url: 'https://github.com/zubinraj/' },
        ],
        licenseHeading: 'License',
        licenseText: 'See <a href="#license/">here</a> for more information.',
        activate: activate
    }

    return ctor;

    function activate() {

    }
});