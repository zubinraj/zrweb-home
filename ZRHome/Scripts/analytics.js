/*
    Script for integrating with the analytics framework
*/

if (navigator.userAgent.match(/IEMobile\/10\.0/)) {
    var msViewportStyle = document.createElement("style");
    var mq = "@@-ms-viewport{width:auto!important}";
    msViewportStyle.appendChild(document.createTextNode(mq));
    document.getElementsByTagName("head")[0].appendChild(msViewportStyle);
}

// initialize google analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-21501791-3']);
_gaq.push(['_setDomainName', 'zubinraj.com']);
//_gaq.push(['_trackPageview']);   // moved to shell.js to report on page transition

(function () {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();