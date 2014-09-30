define(['services/logger'], function (logger) {

    var contact = {
        title: 'Contact',
        channels: [
            { channel: 'email', text: 'contact @ zubinraj . com', url: '' },
            { channel: 'twitter', text: '@zubinraj', url: 'https://twitter.com/zubinraj' },
            { channel: 'github', text: 'https://github.com/zubinraj/', url: 'https://github.com/zubinraj/' }
        ],
        license: {
            heading: 'License',
            description: 'See <a href="#license/">here</a> for license information and details about <a href="#license/">third party licenses</a> used in this website.'
        },
        disclaimer: {
            heading: 'Disclaimer',
            description: 'Any source code and opinions provided in this website is provided "as-is" and does not have any warranty or support. However, if you have a question, you can always contact me through the aforementioned channels. The opinions expressed herein are my own personal opinions and do not represent my employer’s view in any way.'
        }
    };

    return contact;

});