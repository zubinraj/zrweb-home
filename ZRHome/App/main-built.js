(function () {
/**
 * almond 0.2.0 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name) && !defining.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    function onResourceLoad(name, defined, deps){
        if(requirejs.onResourceLoad && name){
            requirejs.onResourceLoad({defined:defined}, {id:name}, deps);
        }
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (defined.hasOwnProperty(depName) ||
                           waiting.hasOwnProperty(depName) ||
                           defining.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }

        onResourceLoad(name, defined, args);
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("../Scripts/almond-custom", function(){});

define('durandal/system',["require","jquery"],function(e,t){function n(e){var t="[object "+e+"]";i["is"+e]=function(e){return s.call(e)==t}}var i,r=!1,o=Object.keys,a=Object.prototype.hasOwnProperty,s=Object.prototype.toString,l=!1,c=Array.isArray,u=Array.prototype.slice;if(Function.prototype.bind&&("object"==typeof console||"function"==typeof console)&&"object"==typeof console.log)try{["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach(function(e){console[e]=this.call(console[e],console)},Function.prototype.bind)}catch(d){l=!0}e.on&&e.on("moduleLoaded",function(e,t){i.setModuleId(e,t)}),"undefined"!=typeof requirejs&&(requirejs.onResourceLoad=function(e,t){i.setModuleId(e.defined[t.id],t.id)});var f=function(){},g=function(){try{if("undefined"!=typeof console&&"function"==typeof console.log)if(window.opera)for(var e=0;e<arguments.length;)console.log("Item "+(e+1)+": "+arguments[e]),e++;else 1==u.call(arguments).length&&"string"==typeof u.call(arguments)[0]?console.log(u.call(arguments).toString()):console.log.apply(console,u.call(arguments));else Function.prototype.bind&&!l||"undefined"==typeof console||"object"!=typeof console.log||Function.prototype.call.call(console.log,console,u.call(arguments))}catch(t){}},v=function(e){if(e instanceof Error)throw e;throw new Error(e)};i={version:"2.0.0",noop:f,getModuleId:function(e){return e?"function"==typeof e?e.prototype.__moduleId__:"string"==typeof e?null:e.__moduleId__:null},setModuleId:function(e,t){return e?"function"==typeof e?(e.prototype.__moduleId__=t,void 0):("string"!=typeof e&&(e.__moduleId__=t),void 0):void 0},resolveObject:function(e){return i.isFunction(e)?new e:e},debug:function(e){return 1==arguments.length&&(r=e,r?(this.log=g,this.error=v,this.log("Debug:Enabled")):(this.log("Debug:Disabled"),this.log=f,this.error=f)),r},log:f,error:f,assert:function(e,t){e||i.error(new Error(t||"Assert:Failed"))},defer:function(e){return t.Deferred(e)},guid:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){var t=0|16*Math.random(),n="x"==e?t:8|3&t;return n.toString(16)})},acquire:function(){var t,n=arguments[0],r=!1;return i.isArray(n)?(t=n,r=!0):t=u.call(arguments,0),this.defer(function(n){e(t,function(){var e=arguments;setTimeout(function(){e.length>1||r?n.resolve(u.call(e,0)):n.resolve(e[0])},1)},function(e){n.reject(e)})}).promise()},extend:function(e){for(var t=u.call(arguments,1),n=0;n<t.length;n++){var i=t[n];if(i)for(var r in i)e[r]=i[r]}return e},wait:function(e){return i.defer(function(t){setTimeout(t.resolve,e)}).promise()}},i.keys=o||function(e){if(e!==Object(e))throw new TypeError("Invalid object");var t=[];for(var n in e)a.call(e,n)&&(t[t.length]=n);return t},i.isElement=function(e){return!(!e||1!==e.nodeType)},i.isArray=c||function(e){return"[object Array]"==s.call(e)},i.isObject=function(e){return e===Object(e)},i.isBoolean=function(e){return"boolean"==typeof e},i.isPromise=function(e){return e&&i.isFunction(e.then)};for(var p=["Arguments","Function","String","Number","Date","RegExp"],h=0;h<p.length;h++)n(p[h]);return i});
define('durandal/viewEngine',["durandal/system","jquery"],function(e,t){var n;return n=t.parseHTML?function(e){return t.parseHTML(e)}:function(e){return t(e).get()},{viewExtension:".html",viewPlugin:"text",isViewUrl:function(e){return-1!==e.indexOf(this.viewExtension,e.length-this.viewExtension.length)},convertViewUrlToViewId:function(e){return e.substring(0,e.length-this.viewExtension.length)},convertViewIdToRequirePath:function(e){return this.viewPlugin+"!"+e+this.viewExtension},parseMarkup:n,processMarkup:function(e){var t=this.parseMarkup(e);return this.ensureSingleElement(t)},ensureSingleElement:function(e){if(1==e.length)return e[0];for(var n=[],i=0;i<e.length;i++){var r=e[i];if(8!=r.nodeType){if(3==r.nodeType){var o=/\S/.test(r.nodeValue);if(!o)continue}n.push(r)}}return n.length>1?t(n).wrapAll('<div class="durandal-wrapper"></div>').parent().get(0):n[0]},createView:function(t){var n=this,i=this.convertViewIdToRequirePath(t);return e.defer(function(r){e.acquire(i).then(function(e){var i=n.processMarkup(e);i.setAttribute("data-view",t),r.resolve(i)}).fail(function(e){n.createFallbackView(t,i,e).then(function(e){e.setAttribute("data-view",t),r.resolve(e)})})}).promise()},createFallbackView:function(t,n){var i=this,r='View Not Found. Searched for "'+t+'" via path "'+n+'".';return e.defer(function(e){e.resolve(i.processMarkup('<div class="durandal-view-404">'+r+"</div>"))}).promise()}}});
define('durandal/viewLocator',["durandal/system","durandal/viewEngine"],function(e,t){function n(e,t){for(var n=0;n<e.length;n++){var i=e[n],r=i.getAttribute("data-view");if(r==t)return i}}function i(e){return(e+"").replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g,"\\$1")}return{useConvention:function(e,t,n){e=e||"viewmodels",t=t||"views",n=n||t;var r=new RegExp(i(e),"gi");this.convertModuleIdToViewId=function(e){return e.replace(r,t)},this.translateViewIdToArea=function(e,t){return t&&"partial"!=t?n+"/"+t+"/"+e:n+"/"+e}},locateViewForObject:function(t,n,i){var r;if(t.getView&&(r=t.getView()))return this.locateView(r,n,i);if(t.viewUrl)return this.locateView(t.viewUrl,n,i);var o=e.getModuleId(t);return o?this.locateView(this.convertModuleIdToViewId(o),n,i):this.locateView(this.determineFallbackViewId(t),n,i)},convertModuleIdToViewId:function(e){return e},determineFallbackViewId:function(e){var t=/function (.{1,})\(/,n=t.exec(e.constructor.toString()),i=n&&n.length>1?n[1]:"";return"views/"+i},translateViewIdToArea:function(e){return e},locateView:function(i,r,o){if("string"==typeof i){var a;if(a=t.isViewUrl(i)?t.convertViewUrlToViewId(i):i,r&&(a=this.translateViewIdToArea(a,r)),o){var s=n(o,a);if(s)return e.defer(function(e){e.resolve(s)}).promise()}return t.createView(a)}return e.defer(function(e){e.resolve(i)}).promise()}}});
define('durandal/binder',["durandal/system","knockout"],function(e,t){function n(t){return void 0===t?{applyBindings:!0}:e.isBoolean(t)?{applyBindings:t}:(void 0===t.applyBindings&&(t.applyBindings=!0),t)}function i(i,c,u,d){if(!c||!u)return r.throwOnErrors?e.error(o):e.log(o,c,d),void 0;if(!c.getAttribute)return r.throwOnErrors?e.error(a):e.log(a,c,d),void 0;var f=c.getAttribute("data-view");try{var v;return i&&i.binding&&(v=i.binding(c)),v=n(v),r.binding(d,c,v),v.applyBindings?(e.log("Binding",f,d),t.applyBindings(u,c)):i&&t.utils.domData.set(c,l,{$data:i}),r.bindingComplete(d,c,v),i&&i.bindingComplete&&i.bindingComplete(c),t.utils.domData.set(c,s,v),v}catch(g){g.message=g.message+";\nView: "+f+";\nModuleId: "+e.getModuleId(d),r.throwOnErrors?e.error(g):e.log(g.message)}}var r,o="Insufficient Information to Bind",a="Unexpected View Type",s="durandal-binding-instruction",l="__ko_bindingContext__";return r={binding:e.noop,bindingComplete:e.noop,throwOnErrors:!1,getBindingInstruction:function(e){return t.utils.domData.get(e,s)},bindContext:function(e,t,n){return n&&e&&(e=e.createChildContext(n)),i(n,t,e,n||(e?e.$data:null))},bind:function(e,t){return i(e,t,e,e)}}});
define('durandal/activator',["durandal/system","knockout"],function(e,t){function n(e){return void 0==e&&(e={}),e.closeOnDeactivate||(e.closeOnDeactivate=c.defaults.closeOnDeactivate),e.beforeActivate||(e.beforeActivate=c.defaults.beforeActivate),e.afterDeactivate||(e.afterDeactivate=c.defaults.afterDeactivate),e.affirmations||(e.affirmations=c.defaults.affirmations),e.interpretResponse||(e.interpretResponse=c.defaults.interpretResponse),e.areSameItem||(e.areSameItem=c.defaults.areSameItem),e}function i(t,n,i){return e.isArray(i)?t[n].apply(t,i):t[n](i)}function r(t,n,i,r,o){if(t&&t.deactivate){e.log("Deactivating",t);var a;try{a=t.deactivate(n)}catch(s){return e.error(s),r.resolve(!1),void 0}a&&a.then?a.then(function(){i.afterDeactivate(t,n,o),r.resolve(!0)},function(t){e.log(t),r.resolve(!1)}):(i.afterDeactivate(t,n,o),r.resolve(!0))}else t&&i.afterDeactivate(t,n,o),r.resolve(!0)}function o(t,n,r,o){if(t)if(t.activate){e.log("Activating",t);var a;try{a=i(t,"activate",o)}catch(s){return e.error(s),r(!1),void 0}a&&a.then?a.then(function(){n(t),r(!0)},function(t){e.log(t),r(!1)}):(n(t),r(!0))}else n(t),r(!0);else r(!0)}function a(t,n,i){return i.lifecycleData=null,e.defer(function(r){if(t&&t.canDeactivate){var o;try{o=t.canDeactivate(n)}catch(a){return e.error(a),r.resolve(!1),void 0}o.then?o.then(function(e){i.lifecycleData=e,r.resolve(i.interpretResponse(e))},function(t){e.error(t),r.resolve(!1)}):(i.lifecycleData=o,r.resolve(i.interpretResponse(o)))}else r.resolve(!0)}).promise()}function s(t,n,r,o){return r.lifecycleData=null,e.defer(function(a){if(t==n())return a.resolve(!0),void 0;if(t&&t.canActivate){var s;try{s=i(t,"canActivate",o)}catch(l){return e.error(l),a.resolve(!1),void 0}s.then?s.then(function(e){r.lifecycleData=e,a.resolve(r.interpretResponse(e))},function(t){e.error(t),a.resolve(!1)}):(r.lifecycleData=s,a.resolve(r.interpretResponse(s)))}else a.resolve(!0)}).promise()}function l(i,l){var c,u=t.observable(null);l=n(l);var d=t.computed({read:function(){return u()},write:function(e){d.viaSetter=!0,d.activateItem(e)}});return d.__activator__=!0,d.settings=l,l.activator=d,d.isActivating=t.observable(!1),d.canDeactivateItem=function(e,t){return a(e,t,l)},d.deactivateItem=function(t,n){return e.defer(function(e){d.canDeactivateItem(t,n).then(function(i){i?r(t,n,l,e,u):(d.notifySubscribers(),e.resolve(!1))})}).promise()},d.canActivateItem=function(e,t){return s(e,u,l,t)},d.activateItem=function(t,n){var i=d.viaSetter;return d.viaSetter=!1,e.defer(function(a){if(d.isActivating())return a.resolve(!1),void 0;d.isActivating(!0);var s=u();return l.areSameItem(s,t,c,n)?(d.isActivating(!1),a.resolve(!0),void 0):(d.canDeactivateItem(s,l.closeOnDeactivate).then(function(f){f?d.canActivateItem(t,n).then(function(f){f?e.defer(function(e){r(s,l.closeOnDeactivate,l,e)}).promise().then(function(){t=l.beforeActivate(t,n),o(t,u,function(e){c=n,d.isActivating(!1),a.resolve(e)},n)}):(i&&d.notifySubscribers(),d.isActivating(!1),a.resolve(!1))}):(i&&d.notifySubscribers(),d.isActivating(!1),a.resolve(!1))}),void 0)}).promise()},d.canActivate=function(){var e;return i?(e=i,i=!1):e=d(),d.canActivateItem(e)},d.activate=function(){var e;return i?(e=i,i=!1):e=d(),d.activateItem(e)},d.canDeactivate=function(e){return d.canDeactivateItem(d(),e)},d.deactivate=function(e){return d.deactivateItem(d(),e)},d.includeIn=function(e){e.canActivate=function(){return d.canActivate()},e.activate=function(){return d.activate()},e.canDeactivate=function(e){return d.canDeactivate(e)},e.deactivate=function(e){return d.deactivate(e)}},l.includeIn?d.includeIn(l.includeIn):i&&d.activate(),d.forItems=function(t){l.closeOnDeactivate=!1,l.determineNextItemToActivate=function(e,t){var n=t-1;return-1==n&&e.length>1?e[1]:n>-1&&n<e.length-1?e[n]:null},l.beforeActivate=function(e){var n=d();if(e){var i=t.indexOf(e);-1==i?t.push(e):e=t()[i]}else e=l.determineNextItemToActivate(t,n?t.indexOf(n):0);return e},l.afterDeactivate=function(e,n){n&&t.remove(e)};var n=d.canDeactivate;d.canDeactivate=function(i){return i?e.defer(function(e){function n(){for(var t=0;t<o.length;t++)if(!o[t])return e.resolve(!1),void 0;e.resolve(!0)}for(var r=t(),o=[],a=0;a<r.length;a++)d.canDeactivateItem(r[a],i).then(function(e){o.push(e),o.length==r.length&&n()})}).promise():n()};var i=d.deactivate;return d.deactivate=function(n){return n?e.defer(function(e){function i(i){d.deactivateItem(i,n).then(function(){o++,t.remove(i),o==a&&e.resolve()})}for(var r=t(),o=0,a=r.length,s=0;a>s;s++)i(r[s])}).promise():i()},d},d}var c,u={closeOnDeactivate:!0,affirmations:["yes","ok","true"],interpretResponse:function(n){return e.isObject(n)&&(n=n.can||!1),e.isString(n)?-1!==t.utils.arrayIndexOf(this.affirmations,n.toLowerCase()):n},areSameItem:function(e,t){return e==t},beforeActivate:function(e){return e},afterDeactivate:function(e,t,n){t&&n&&n(null)}};return c={defaults:u,create:l,isActivator:function(e){return e&&e.__activator__}}});
define('durandal/composition',["durandal/system","durandal/viewLocator","durandal/binder","durandal/viewEngine","durandal/activator","jquery","knockout"],function(e,t,n,i,r,o,a){function s(e){for(var t=[],n={childElements:t,activeView:null},i=a.virtualElements.firstChild(e);i;)1==i.nodeType&&(t.push(i),i.getAttribute(m)&&(n.activeView=i)),i=a.virtualElements.nextSibling(i);return n.activeView||(n.activeView=t[0]),n}function l(){y--,0===y&&setTimeout(function(){for(var e=b.length;e--;)b[e]();b=[]},1)}function c(t,n,i){if(i)n();else if(t.activate&&t.model&&t.model.activate){var r;r=e.isArray(t.activationData)?t.model.activate.apply(t.model,t.activationData):t.model.activate(t.activationData),r&&r.then?r.then(n):r||void 0===r?n():l()}else n()}function u(){var t=this;t.activeView&&t.activeView.removeAttribute(m),t.child&&(t.model&&t.model.attached&&(t.composingNewView||t.alwaysTriggerAttach)&&t.model.attached(t.child,t.parent,t),t.attached&&t.attached(t.child,t.parent,t),t.child.setAttribute(m,!0),t.composingNewView&&t.model&&(t.model.compositionComplete&&h.current.complete(function(){t.model.compositionComplete(t.child,t.parent,t)}),t.model.detached&&a.utils.domNodeDisposal.addDisposeCallback(t.child,function(){t.model.detached(t.child,t.parent,t)})),t.compositionComplete&&h.current.complete(function(){t.compositionComplete(t.child,t.parent,t)})),l(),t.triggerAttach=e.noop}function d(t){if(e.isString(t.transition)){if(t.activeView){if(t.activeView==t.child)return!1;if(!t.child)return!0;if(t.skipTransitionOnSameViewId){var n=t.activeView.getAttribute("data-view"),i=t.child.getAttribute("data-view");return n!=i}}return!0}return!1}function f(e){for(var t=0,n=e.length,i=[];n>t;t++){var r=e[t].cloneNode(!0);i.push(r)}return i}function v(e){var t=f(e.parts),n=h.getParts(t),i=h.getParts(e.child);for(var r in n)o(i[r]).replaceWith(n[r])}function g(t){var n,i,r=a.virtualElements.childNodes(t);if(!e.isArray(r)){var o=[];for(n=0,i=r.length;i>n;n++)o[n]=r[n];r=o}for(n=1,i=r.length;i>n;n++)a.removeNode(r[n])}var h,p={},m="data-active-view",b=[],y=0,w="durandal-composition-data",x="data-part",k="["+x+"]",I=["model","view","transition","area","strategy","activationData"],S={complete:function(e){b.push(e)}};return h={convertTransitionToModuleId:function(e){return"transitions/"+e},defaultTransitionName:null,current:S,addBindingHandler:function(e,t,n){var i,r,o="composition-handler-"+e;t=t||a.bindingHandlers[e],n=n||function(){return void 0},r=a.bindingHandlers[e]={init:function(e,i,r,s,l){var c={trigger:a.observable(null)};return h.current.complete(function(){t.init&&t.init(e,i,r,s,l),t.update&&(a.utils.domData.set(e,o,t),c.trigger("trigger"))}),a.utils.domData.set(e,o,c),n(e,i,r,s,l)},update:function(e,t,n,i,r){var s=a.utils.domData.get(e,o);return s.update?s.update(e,t,n,i,r):(s.trigger(),void 0)}};for(i in t)"init"!==i&&"update"!==i&&(r[i]=t[i])},getParts:function(t){var n={};e.isArray(t)||(t=[t]);for(var i=0;i<t.length;i++){var r=t[i];if(r.getAttribute){var a=r.getAttribute(x);a&&(n[a]=r);for(var s=o(k,r).not(o("[data-bind] "+k,r)),l=0;l<s.length;l++){var c=s.get(l);n[c.getAttribute(x)]=c}}}return n},cloneNodes:f,finalize:function(t){if(t.transition=t.transition||this.defaultTransitionName,t.child||t.activeView)if(d(t)){var i=this.convertTransitionToModuleId(t.transition);e.acquire(i).then(function(e){t.transition=e,e(t).then(function(){if(t.cacheViews){if(t.activeView){var e=n.getBindingInstruction(t.activeView);void 0==e.cacheViews||e.cacheViews||a.removeNode(t.activeView)}}else t.child?g(t.parent):a.virtualElements.emptyNode(t.parent);t.triggerAttach()})}).fail(function(t){e.error("Failed to load transition ("+i+"). Details: "+t.message)})}else{if(t.child!=t.activeView){if(t.cacheViews&&t.activeView){var r=n.getBindingInstruction(t.activeView);void 0==r.cacheViews||r.cacheViews?o(t.activeView).hide():a.removeNode(t.activeView)}t.child?(t.cacheViews||g(t.parent),o(t.child).show()):t.cacheViews||a.virtualElements.emptyNode(t.parent)}t.triggerAttach()}else t.cacheViews||a.virtualElements.emptyNode(t.parent),t.triggerAttach()},bindAndShow:function(e,t,r){t.child=e,t.composingNewView=t.cacheViews?-1==a.utils.arrayIndexOf(t.viewElements,e):!0,c(t,function(){if(t.binding&&t.binding(t.child,t.parent,t),t.preserveContext&&t.bindingContext)t.composingNewView&&(t.parts&&v(t),o(e).hide(),a.virtualElements.prepend(t.parent,e),n.bindContext(t.bindingContext,e,t.model));else if(e){var r=t.model||p,s=a.dataFor(e);if(s!=r){if(!t.composingNewView)return o(e).remove(),i.createView(e.getAttribute("data-view")).then(function(e){h.bindAndShow(e,t,!0)}),void 0;t.parts&&v(t),o(e).hide(),a.virtualElements.prepend(t.parent,e),n.bind(r,e)}}h.finalize(t)},r)},defaultStrategy:function(e){return t.locateViewForObject(e.model,e.area,e.viewElements)},getSettings:function(t){var n,o=t(),s=a.utils.unwrapObservable(o)||{},l=r.isActivator(o);if(e.isString(s))return s=i.isViewUrl(s)?{view:s}:{model:s,activate:!0};if(n=e.getModuleId(s))return s={model:s,activate:!0};!l&&s.model&&(l=r.isActivator(s.model));for(var c in s)s[c]=-1!=a.utils.arrayIndexOf(I,c)?a.utils.unwrapObservable(s[c]):s[c];return l?s.activate=!1:void 0===s.activate&&(s.activate=!0),s},executeStrategy:function(e){e.strategy(e).then(function(t){h.bindAndShow(t,e)})},inject:function(n){return n.model?n.view?(t.locateView(n.view,n.area,n.viewElements).then(function(e){h.bindAndShow(e,n)}),void 0):(n.strategy||(n.strategy=this.defaultStrategy),e.isString(n.strategy)?e.acquire(n.strategy).then(function(e){n.strategy=e,h.executeStrategy(n)}).fail(function(t){e.error("Failed to load view strategy ("+n.strategy+"). Details: "+t.message)}):this.executeStrategy(n),void 0):(this.bindAndShow(null,n),void 0)},compose:function(n,i,r,o){y++,o||(i=h.getSettings(function(){return i},n));var a=s(n);i.activeView=a.activeView,i.parent=n,i.triggerAttach=u,i.bindingContext=r,i.cacheViews&&!i.viewElements&&(i.viewElements=a.childElements),i.model?e.isString(i.model)?e.acquire(i.model).then(function(t){i.model=e.resolveObject(t),h.inject(i)}).fail(function(t){e.error("Failed to load composed module ("+i.model+"). Details: "+t.message)}):h.inject(i):i.view?(i.area=i.area||"partial",i.preserveContext=!0,t.locateView(i.view,i.area,i.viewElements).then(function(e){h.bindAndShow(e,i)})):this.bindAndShow(null,i)}},a.bindingHandlers.compose={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,r,o){var s=h.getSettings(t,e);if(s.mode){var l=a.utils.domData.get(e,w);if(!l){var c=a.virtualElements.childNodes(e);l={},"inline"===s.mode?l.view=i.ensureSingleElement(c):"templated"===s.mode&&(l.parts=f(c)),a.virtualElements.emptyNode(e),a.utils.domData.set(e,w,l)}"inline"===s.mode?s.view=l.view.cloneNode(!0):"templated"===s.mode&&(s.parts=l.parts),s.preserveContext=!0}h.compose(e,s,o,!0)}},a.virtualElements.allowedBindings.compose=!0,h});
define('durandal/events',["durandal/system"],function(e){var t=/\s+/,n=function(){},i=function(e,t){this.owner=e,this.events=t};return i.prototype.then=function(e,t){return this.callback=e||this.callback,this.context=t||this.context,this.callback?(this.owner.on(this.events,this.callback,this.context),this):this},i.prototype.on=i.prototype.then,i.prototype.off=function(){return this.owner.off(this.events,this.callback,this.context),this},n.prototype.on=function(e,n,r){var o,a,s;if(n){for(o=this.callbacks||(this.callbacks={}),e=e.split(t);a=e.shift();)s=o[a]||(o[a]=[]),s.push(n,r);return this}return new i(this,e)},n.prototype.off=function(n,i,r){var o,a,s,l;if(!(a=this.callbacks))return this;if(!(n||i||r))return delete this.callbacks,this;for(n=n?n.split(t):e.keys(a);o=n.shift();)if((s=a[o])&&(i||r))for(l=s.length-2;l>=0;l-=2)i&&s[l]!==i||r&&s[l+1]!==r||s.splice(l,2);else delete a[o];return this},n.prototype.trigger=function(e){var n,i,r,o,a,s,l,c;if(!(i=this.callbacks))return this;for(c=[],e=e.split(t),o=1,a=arguments.length;a>o;o++)c[o-1]=arguments[o];for(;n=e.shift();){if((l=i.all)&&(l=l.slice()),(r=i[n])&&(r=r.slice()),r)for(o=0,a=r.length;a>o;o+=2)r[o].apply(r[o+1]||this,c);if(l)for(s=[n].concat(c),o=0,a=l.length;a>o;o+=2)l[o].apply(l[o+1]||this,s)}return this},n.prototype.proxy=function(e){var t=this;return function(n){t.trigger(e,n)}},n.includeIn=function(e){e.on=n.prototype.on,e.off=n.prototype.off,e.trigger=n.prototype.trigger,e.proxy=n.prototype.proxy},n});
define('durandal/app',["durandal/system","durandal/viewEngine","durandal/composition","durandal/events","jquery"],function(e,t,n,i,r){function o(){return e.defer(function(t){return 0==s.length?(t.resolve(),void 0):(e.acquire(s).then(function(n){for(var i=0;i<n.length;i++){var r=n[i];if(r.install){var o=l[i];e.isObject(o)||(o={}),r.install(o),e.log("Plugin:Installed "+s[i])}else e.log("Plugin:Loaded "+s[i])}t.resolve()}).fail(function(t){e.error("Failed to load plugin(s). Details: "+t.message)}),void 0)}).promise()}var a,s=[],l=[];return a={title:"Application",configurePlugins:function(t,n){var i=e.keys(t);n=n||"plugins/",-1===n.indexOf("/",n.length-1)&&(n+="/");for(var r=0;r<i.length;r++){var o=i[r];s.push(n+o),l.push(t[o])}},start:function(){return e.log("Application:Starting"),this.title&&(document.title=this.title),e.defer(function(t){r(function(){o().then(function(){t.resolve(),e.log("Application:Started")})})}).promise()},setRoot:function(i,r,o){var a,s={activate:!0,transition:r};a=!o||e.isString(o)?document.getElementById(o||"applicationHost"):o,e.isString(i)?t.isViewUrl(i)?s.view=i:s.model=i:s.model=i,n.compose(a,s)}},i.includeIn(a),a});
define('services/logger',["durandal/system"],function(e){function t(e,t,n,r){i(e,t,n,r,"info")}function n(e,t,n,r){i(e,t,n,r,"error")}function i(t,n,i,r,o){i=i?"["+i+"] ":"",n?e.log(i,t,n):e.log(i,t),r&&("error"===o?toastr.error(t):toastr.info(t))}var r={log:t,logError:n};return r});
requirejs.config({urlArgs:"bust="+(new Date).getTime(),paths:{text:"../Scripts/text",durandal:"../Scripts/durandal",plugins:"../Scripts/durandal/plugins",transitions:"../Scripts/durandal/transitions"}}),define("jquery",[],function(){return jQuery}),define("knockout",ko),define('main',["durandal/system","durandal/app","durandal/viewLocator","services/logger"],function(e,t,n){e.debug(!0),t.title="ZUBINRAJ.COM",t.configurePlugins({router:!0,dialog:!0,widget:!0}),t.start().then(function(){toastr.options.positionClass="toast-bottom-right",toastr.options.backgroundpositionClass="toast-bottom-right",n.useConvention(),t.setRoot("viewmodels/shell","entrance")})});
define('services/blogstream',["durandal/system","durandal/app","knockout","services/logger"],function(e,t,n){function i(e){return a().length>0?void 0:(a.removeAll(),o.removeAll(),$.ajax(e).done(r).fail())}function r(e){var t=$(e);t.find("item").each(function(){var e="",t=$(this);({cat:t.find("category").each(function(){e+=" "+$(this).text().toLowerCase()})});var n=$(this),i={title:n.find("title").text(),link:n.find("link").text(),description:n.find("description").text(),pubDate:n.find("pubDate").text(),author:n.find("author").text(),categories:e};a().push(i)}),console.log("Blog: Stream count: "+a().length);for(var n=0;10>n&&n<a().length;n++)o().push(a()[n]);console.log("Blog: Partial stream count: "+o().length)}var a=n.observableArray([]),o=n.observableArray([]);return{stream:a,partialStream:o,load:i}});
define('services/common',["durandal/system","durandal/app","knockout","services/logger"],function(){return{blogUrl:"/rss_b.xml",photoUrl:"/rss.xml",blogPartialStreamCount:10,photosPartialStreamCount:3,initializeLazyLoad:function(){$("img.lazy").lazyload({effect:"fadeIn"})},initializeFancyBox:function(){$(".fancybox-thumb").fancybox({prevEffect:"none",nextEffect:"none",helpers:{title:{type:"outside"},thumbs:{width:50,height:50}}})},showLoader:function(){$(".loading").show()},hideLoader:function(){$(".loading").hide()}}});
define('services/photostream',["durandal/system","durandal/app","knockout","services/logger"],function(t,e,n){function i(t){function e(t){var e=$(t);e.find("item").each(function(){var t="",e=$(this);({cat:e.find("category").each(function(){t+=" "+$(this).text().toLowerCase()})});var n=$(this).find("thumb"),i=$(this).find("original"),a=$(this),o={title:a.find("title").text(),link:a.find("link").text(),description:a.find("description").text(),categories:t,pubDate:a.find("pubDate").text(),author:a.find("author").text(),thumbUrl:n.text(),thumbHeight:n.attr("height"),thumbWidth:n.attr("width"),originalUrl:i.text(),originalHeight:i.attr("height"),originalWidth:i.attr("width")};r().push(o)}),console.log("Photos: Stream count: "+r().length);for(var n=0;3>n&&n<r().length;n++)a().push(r()[n]);return console.log("Photos: Partial stream count: "+a().length),!0}r().length>0||(r.removeAll(),a.removeAll(),$.ajax(t).done(e).fail())}var r=n.observableArray([]),a=n.observableArray([]);return{stream:r,partialStream:a,load:i}});
define('plugins/http',["jquery","knockout"],function(e,t){return{callbackParam:"callback",get:function(t,n){return e.ajax(t,{data:n})},jsonp:function(t,n,i){return-1==t.indexOf("=?")&&(i=i||this.callbackParam,t+=-1==t.indexOf("?")?"?":"&",t+=i+"=?"),e.ajax({url:t,dataType:"jsonp",data:n})},post:function(n,i){return e.ajax({url:n,data:t.toJSON(i),type:"POST",contentType:"application/json",dataType:"json"})}}});
define('viewmodels/blog',["plugins/http","knockout","services/logger","services/blogstream","services/common"],function(t,e,n,i,r){function o(){var t=$("#blog-container");t.isotope("reLayout"),$("#blog .filters a").click(function(){var e=$(this).attr("data-filter");return t.isotope({filter:e}),$(this).toggleClass("selected"),$("#blog .filters a").not(this).removeClass("selected"),!1}),r.hideLoader()}function a(){return s(),$.when(i.load(r.blogUrl,"#loader")).then(function(){console.log("Data loaded successfully"),l(i.stream())})}function s(){e.bindingHandlers.isotope={init:function(){},update:function(t,n){var i=$(t),r=e.utils.unwrapObservable(n());i.hasClass("isotope")?i.isotope("reLayout"):i.isotope({itemSelector:r.itemSelector})}}}var l=e.observableArray([]);return{title:"Zubin's Web Log",items:l,activate:a,compositionComplete:o}});
define('viewmodels/contact',["services/logger"],function(){return{title:"Contact",channels:[{channel:"email",text:"support @ zubinraj dot com",url:""},{channel:"twitter",text:"@zubinraj",url:"https://twitter.com/zubinraj"},{channel:"github",text:"https://github.com/zubinraj/",url:"https://github.com/zubinraj/"}],license:{heading:"License",description:'Photos, source code and articles published on this website, that are not explicitly mentioned otherwise, are licensed under <a  target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US">Creative Commons Attribution-NonCommercial 3.0 Unported</a> license. See <a href="#license/">here</a> for more information and details about <a href="#license/">third party licenses</a> used in this website.'},disclaimer:{heading:"Disclaimer",description:'Any source code and opinions provided in this website is provided "as-is" and does not have any warranty or support. However, if you have a question, you can always contact me through the aforementioned channels. The opinions expressed herein are my own personal opinions and do not represent my employer’s view in any way.'}}});
define('viewmodels/error',["plugins/http","knockout","services/logger"],function(){function e(){}return{activate:e}});
define('viewmodels/license',["services/logger"],function(){function e(){}return{title:"License",description:'Photos, source code and articles published on this website, that are not explicitly mentioned otherwise, are licensed under <a target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US">Creative Commons Attribution-NonCommercial 3.0 Unported</a> license.',terms:[{term:"Attribution"},{term:"Non-Commercial"}],creativeCommons:'<a rel="license" target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="./Content/images/cc_attribution_nocommercial_88x31.png" /></a>',termsOverride:"If any section of this website mentions it's own licensing terms, that will override the terms mentioned here.",commercial:{heading:"Commercial",description:'If you want a higher quality photo published on this website for commercial use, please <a href="#contact">contact me</a>.'},thirdParty:{heading:"Third Party Licenses",description:"This website uses the following awesome libraries:",libraries:[{library:"Durandal JS",license:"MIT",url:"https://raw.github.com/BlueSpire/Durandal/master/License.txt"},{library:"Knockout JS",license:"MIT",url:"https://github.com/knockout/knockout#license"},{library:"Bootstrap",license:"Apache",url:"https://github.com/twbs/bootstrap/blob/master/LICENSE"},{library:"Isotope",license:"MIT / Commercial",url:"http://isotope.metafizzy.co/docs/license.html"},{library:"Require JS",license:'MIT / "New" BSD',url:"https://github.com/jrburke/requirejs/blob/master/LICENSE"},{library:"Lazy Load Plugin for JQuery",license:"MIT",url:"https://github.com/tuupola/jquery_lazyload#license"},{library:"fancyBox",license:"MIT",url:"http://www.fancyapps.com/fancybox/#license"}]},activate:e}});
define('viewmodels/photos',["plugins/http","knockout","services/logger","services/photostream","services/common"],function(e,t,n,i,r){function o(){var e=$("#gallery-container");e.isotope("reLayout"),r.initializeLazyLoad(),r.initializeFancyBox(),$("#gallery .filters a").click(function(){var t=$(this).attr("data-filter");return e.isotope({filter:t}),$(this).toggleClass("selected"),$("#gallery .filters a").not(this).removeClass("selected"),!1}),r.hideLoader()}function a(){return s(),$.when(i.load(r.photoUrl)).done(function(){console.log("Data loaded successfully"),l(i.stream())})}function s(){t.bindingHandlers.isotope={update:function(e,n){var i=$(e),r=t.utils.unwrapObservable(n());i.hasClass("isotope")?i.isotope("reLayout"):i.isotope({itemSelector:r.itemSelector})}}}var l=t.observableArray([]);return{title:"Ann & Zubin Photography",images:l,activate:a,compositionComplete:o}});
define('plugins/history',["durandal/system","jquery"],function(e,t){function n(e,t,n){if(n){var i=e.href.replace(/(javascript:|#).*$/,"");e.replace(i+"#"+t)}else e.hash="#"+t}var i=/^[#\/]|\s+$/g,r=/^\/+|\/+$/g,o=/msie [\w.]+/,a=/\/$/,s={interval:50,active:!1};return"undefined"!=typeof window&&(s.location=window.location,s.history=window.history),s.getHash=function(e){var t=(e||s).location.href.match(/#(.*)$/);return t?t[1]:""},s.getFragment=function(e,t){if(null==e)if(s._hasPushState||!s._wantsHashChange||t){e=s.location.pathname;var n=s.root.replace(a,"");e.indexOf(n)||(e=e.substr(n.length))}else e=s.getHash();return e.replace(i,"")},s.activate=function(n){s.active&&e.error("History has already been activated."),s.active=!0,s.options=e.extend({},{root:"/"},s.options,n),s.root=s.options.root,s._wantsHashChange=s.options.hashChange!==!1,s._wantsPushState=!!s.options.pushState,s._hasPushState=!!(s.options.pushState&&s.history&&s.history.pushState);var a=s.getFragment(),l=document.documentMode,c=o.exec(navigator.userAgent.toLowerCase())&&(!l||7>=l);s.root=("/"+s.root+"/").replace(r,"/"),c&&s._wantsHashChange&&(s.iframe=t('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow,s.navigate(a,!1)),s._hasPushState?t(window).on("popstate",s.checkUrl):s._wantsHashChange&&"onhashchange"in window&&!c?t(window).on("hashchange",s.checkUrl):s._wantsHashChange&&(s._checkUrlInterval=setInterval(s.checkUrl,s.interval)),s.fragment=a;var u=s.location,d=u.pathname.replace(/[^\/]$/,"$&/")===s.root;if(s._wantsHashChange&&s._wantsPushState){if(!s._hasPushState&&!d)return s.fragment=s.getFragment(null,!0),s.location.replace(s.root+s.location.search+"#"+s.fragment),!0;s._hasPushState&&d&&u.hash&&(this.fragment=s.getHash().replace(i,""),this.history.replaceState({},document.title,s.root+s.fragment+u.search))}return s.options.silent?void 0:s.loadUrl()},s.deactivate=function(){t(window).off("popstate",s.checkUrl).off("hashchange",s.checkUrl),clearInterval(s._checkUrlInterval),s.active=!1},s.checkUrl=function(){var e=s.getFragment();return e===s.fragment&&s.iframe&&(e=s.getFragment(s.getHash(s.iframe))),e===s.fragment?!1:(s.iframe&&s.navigate(e,!1),s.loadUrl(),void 0)},s.loadUrl=function(e){var t=s.fragment=s.getFragment(e);return s.options.routeHandler?s.options.routeHandler(t):!1},s.navigate=function(t,i){if(!s.active)return!1;if(void 0===i?i={trigger:!0}:e.isBoolean(i)&&(i={trigger:i}),t=s.getFragment(t||""),s.fragment!==t){s.fragment=t;var r=s.root+t;if(s._hasPushState)s.history[i.replace?"replaceState":"pushState"]({},document.title,r);else{if(!s._wantsHashChange)return s.location.assign(r);n(s.location,t,i.replace),s.iframe&&t!==s.getFragment(s.getHash(s.iframe))&&(i.replace||s.iframe.document.open().close(),n(s.iframe.location,t,i.replace))}return i.trigger?s.loadUrl(t):void 0}},s.navigateBack=function(){s.history.back()},s});
define('plugins/router',["durandal/system","durandal/app","durandal/activator","durandal/events","durandal/composition","plugins/history","knockout","jquery"],function(e,t,n,i,r,o,a,s){function l(e){return e=e.replace(b,"\\$&").replace(h,"(?:$1)?").replace(p,function(e,t){return t?e:"([^/]+)"}).replace(m,"(.*?)"),new RegExp("^"+e+"$")}function c(e){var t=e.indexOf(":"),n=t>0?t-1:e.length;return e.substring(0,n)}function u(e){return e.router&&e.router.loadUrl}function d(e,t){return-1!==e.indexOf(t,e.length-t.length)}function f(e,t){if(!e||!t)return!1;if(e.length!=t.length)return!1;for(var n=0,i=e.length;i>n;n++)if(e[n]!=t[n])return!1;return!0}var g,v,h=/\((.*?)\)/g,p=/(\(\?)?:\w+/g,m=/\*\w+/g,b=/[\-{}\[\]+?.,\\\^$|#\s]/g,y=/\/$/,w=function(){function r(t,n){e.log("Navigation Complete",t,n);var i=e.getModuleId(D);i&&T.trigger("router:navigation:from:"+i),D=t,P=n;var r=e.getModuleId(D);r&&T.trigger("router:navigation:to:"+r),u(t)||T.updateDocumentTitle(t,n),v.explicitNavigation=!1,v.navigatingBack=!1,T.trigger("router:navigation:complete",t,n,T)}function s(t,n){e.log("Navigation Cancelled"),T.activeInstruction(P),P&&T.navigate(P.fragment,!1),O(!1),v.explicitNavigation=!1,v.navigatingBack=!1,T.trigger("router:navigation:cancelled",t,n,T)}function h(t){e.log("Navigation Redirecting"),O(!1),v.explicitNavigation=!1,v.navigatingBack=!1,T.navigate(t,{trigger:!0,replace:!0})}function p(e,t,n){v.navigatingBack=!v.explicitNavigation&&D!=n.fragment,T.trigger("router:route:activating",t,n,T),e.activateItem(t,n.params).then(function(i){if(i){var o=D;r(t,n),u(t)&&I({router:t.router,fragment:n.fragment,queryString:n.queryString}),o==t&&T.attached()}else e.settings.lifecycleData&&e.settings.lifecycleData.redirect?h(e.settings.lifecycleData.redirect):s(t,n);g&&(g.resolve(),g=null)})}function m(t,n,i){var r=T.guardRoute(n,i);r?r.then?r.then(function(r){r?e.isString(r)?h(r):p(t,n,i):s(n,i)}):e.isString(r)?h(r):p(t,n,i):s(n,i)}function b(e,t,n){T.guardRoute?m(e,t,n):p(e,t,n)}function x(e){return P&&P.config.moduleId==e.config.moduleId&&D&&(D.canReuseForRoute&&D.canReuseForRoute.apply(D,e.params)||D.router&&D.router.loadUrl)}function k(){if(!O()){var t=j.shift();if(j=[],t){if(t.router){var i=t.fragment;return t.queryString&&(i+="?"+t.queryString),t.router.loadUrl(i),void 0}O(!0),T.activeInstruction(t),x(t)?b(n.create(),D,t):e.acquire(t.config.moduleId).then(function(n){var i=e.resolveObject(n);b(V,i,t)}).fail(function(n){e.error("Failed to load routed module ("+t.config.moduleId+"). Details: "+n.message)})}}}function I(e){j.unshift(e),k()}function _(e,t,n){for(var i=e.exec(t).slice(1),r=0;r<i.length;r++){var o=i[r];i[r]=o?decodeURIComponent(o):null}var a=T.parseQueryString(n);return a&&i.push(a),{params:i,queryParams:a}}function S(t){T.trigger("router:route:before-config",t,T),e.isRegExp(t)?t.routePattern=t.route:(t.title=t.title||T.convertRouteToTitle(t.route),t.moduleId=t.moduleId||T.convertRouteToModuleId(t.route),t.hash=t.hash||T.convertRouteToHash(t.route),t.routePattern=l(t.route)),T.trigger("router:route:after-config",t,T),T.routes.push(t),T.route(t.routePattern,function(e,n){var i=_(t.routePattern,e,n);I({fragment:e,queryString:n,config:t,params:i.params,queryParams:i.queryParams})})}function A(t){if(e.isArray(t.route))for(var n=0,i=t.route.length;i>n;n++){var r=e.extend({},t);r.route=t.route[n],n>0&&delete r.nav,S(r)}else S(t);return T}function C(e){e.isActive||(e.isActive=a.computed(function(){var t=V();return t&&t.__moduleId__==e.moduleId}))}var D,P,j=[],O=a.observable(!1),V=n.create(),T={handlers:[],routes:[],navigationModel:a.observableArray([]),activeItem:V,isNavigating:a.computed(function(){var e=V(),t=O(),n=e&&e.router&&e.router!=T&&e.router.isNavigating()?!0:!1;return t||n}),activeInstruction:a.observable(null),__router__:!0};return i.includeIn(T),V.settings.areSameItem=function(e,t,n,i){return e==t?f(n,i):!1},T.parseQueryString=function(e){var t,n;if(!e)return null;if(n=e.split("&"),0==n.length)return null;t={};for(var i=0;i<n.length;i++){var r=n[i];if(""!==r){var o=r.split("=");t[o[0]]=o[1]&&decodeURIComponent(o[1].replace(/\+/g," "))}}return t},T.route=function(e,t){T.handlers.push({routePattern:e,callback:t})},T.loadUrl=function(t){var n=T.handlers,i=null,r=t,a=t.indexOf("?");if(-1!=a&&(r=t.substring(0,a),i=t.substr(a+1)),T.relativeToParentRouter){var s=this.parent.activeInstruction();r=s.params.join("/"),r&&"/"==r[0]&&(r=r.substr(1)),r||(r=""),r=r.replace("//","/").replace("//","/")}r=r.replace(y,"");for(var l=0;l<n.length;l++){var c=n[l];if(c.routePattern.test(r))return c.callback(r,i),!0}return e.log("Route Not Found"),T.trigger("router:route:not-found",t,T),P&&o.navigate(P.fragment,{trigger:!1,replace:!0}),v.explicitNavigation=!1,v.navigatingBack=!1,!1},T.updateDocumentTitle=function(e,n){n.config.title?document.title=t.title?n.config.title+" | "+t.title:n.config.title:t.title&&(document.title=t.title)},T.navigate=function(e,t){return e&&-1!=e.indexOf("://")?(window.location.href=e,!0):(v.explicitNavigation=!0,o.navigate(e,t))},T.navigateBack=function(){o.navigateBack()},T.attached=function(){setTimeout(function(){O(!1),T.trigger("router:navigation:attached",D,P,T),k()},10)},T.compositionComplete=function(){T.trigger("router:navigation:composition-complete",D,P,T)},T.convertRouteToHash=function(e){if(T.relativeToParentRouter){var t=T.parent.activeInstruction(),n=t.config.hash+"/"+e;return o._hasPushState&&(n="/"+n),n=n.replace("//","/").replace("//","/")}return o._hasPushState?e:"#"+e},T.convertRouteToModuleId=function(e){return c(e)},T.convertRouteToTitle=function(e){var t=c(e);return t.substring(0,1).toUpperCase()+t.substring(1)},T.map=function(t,n){if(e.isArray(t)){for(var i=0;i<t.length;i++)T.map(t[i]);return T}return e.isString(t)||e.isRegExp(t)?(n?e.isString(n)&&(n={moduleId:n}):n={},n.route=t):n=t,A(n)},T.buildNavigationModel=function(t){var n=[],i=T.routes;t=t||100;for(var r=0;r<i.length;r++){var o=i[r];o.nav&&(e.isNumber(o.nav)||(o.nav=t),C(o),n.push(o))}return n.sort(function(e,t){return e.nav-t.nav}),T.navigationModel(n),T},T.mapUnknownRoutes=function(t,n){var i="*catchall",r=l(i);return T.route(r,function(a,s){var l=_(r,a,s),c={fragment:a,queryString:s,config:{route:i,routePattern:r},params:l.params,queryParams:l.queryParams};if(t)if(e.isString(t))c.config.moduleId=t,n&&o.navigate(n,{trigger:!1,replace:!0});else if(e.isFunction(t)){var u=t(c);if(u&&u.then)return u.then(function(){T.trigger("router:route:before-config",c.config,T),T.trigger("router:route:after-config",c.config,T),I(c)}),void 0}else c.config=t,c.config.route=i,c.config.routePattern=r;else c.config.moduleId=a;T.trigger("router:route:before-config",c.config,T),T.trigger("router:route:after-config",c.config,T),I(c)}),T},T.reset=function(){return P=D=void 0,T.handlers=[],T.routes=[],T.off(),delete T.options,T},T.makeRelative=function(t){return e.isString(t)&&(t={moduleId:t,route:t}),t.moduleId&&!d(t.moduleId,"/")&&(t.moduleId+="/"),t.route&&!d(t.route,"/")&&(t.route+="/"),t.fromParent&&(T.relativeToParentRouter=!0),T.on("router:route:before-config").then(function(e){t.moduleId&&(e.moduleId=t.moduleId+e.moduleId),t.route&&(e.route=""===e.route?t.route.substring(0,t.route.length-1):t.route+e.route)}),T},T.createChildRouter=function(){var e=w();return e.parent=T,e},T};return v=w(),v.explicitNavigation=!1,v.navigatingBack=!1,v.activate=function(t){return e.defer(function(n){if(g=n,v.options=e.extend({routeHandler:v.loadUrl},v.options,t),o.activate(v.options),o._hasPushState)for(var i=v.routes,r=i.length;r--;){var a=i[r];a.hash=a.hash.replace("#","")}s(document).delegate("a","click",function(e){if(v.explicitNavigation=!0,o._hasPushState&&!(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)){var t=s(this).attr("href"),n=this.protocol+"//";(!t||"#"!==t.charAt(0)&&t.slice(n.length)!==n)&&(e.preventDefault(),o.navigate(t))}})}).promise()},v.deactivate=function(){o.deactivate()},v.install=function(){a.bindingHandlers.router={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,i,o){var s=a.utils.unwrapObservable(t())||{};if(s.__router__)s={model:s.activeItem(),attached:s.attached,compositionComplete:s.compositionComplete,activate:!1};else{var l=a.utils.unwrapObservable(s.router||i.router)||v;s.model=l.activeItem(),s.attached=l.attached,s.compositionComplete=l.compositionComplete,s.activate=!1}r.compose(e,s,o)}},a.virtualElements.allowedBindings.router=!0},v});
define('viewmodels/shell',["durandal/system","plugins/router","services/logger"],function(e,t,n){function i(){return r("Welcome!",null,!0),t.on("router:route:not-found",function(e){o("Page not found",e,!0)}),t.map([{route:"",title:"Welcome",icon:"glyphicon-home",moduleId:"viewmodels/welcome",nav:!0},{route:"blog",title:"Blog",icon:"glyphicon-book",moduleId:"viewmodels/blog",nav:!0},{route:"photos",title:"Photography",icon:"glyphicon-camera",moduleId:"viewmodels/photos",nav:!0},{route:"contact",title:"Contact",icon:"glyphicon-envelope",moduleId:"viewmodels/contact",nav:!0},{route:"license",title:"License",icon:"",moduleId:"viewmodels/license",nav:!1},{route:"error",title:"Error",icon:"",moduleId:"viewmodels/error",nav:!1},{route:"error/:id",title:"Error",icon:"",moduleId:"viewmodels/error",nav:!1}]).buildNavigationModel(),t.activate()}function r(t,i,r){n.log(t,i,e.getModuleId(a),r)}function o(t,i,r){n.logError(t,i,e.getModuleId(a),r)}var a={router:t,footer:{copyright:"Copyright © 2010-"+(new Date).getFullYear()+' <a href="http://www.zubinraj.com/">Zubin Raj</a>',lines:[{line:'Follow me on <a href="https://github.com/zubinraj/" target="_blank">GitHub</a> | <a href="https://twitter.com/zubinraj" target="_blank">Twitter</a>'},{line:'Powered by <a href="http://weblogs.asp.net/scottgu/archive/2010/07/02/introducing-razor.aspx">Razor.Net</a>, <a href="http://durandaljs.com/" target="_blank">Durandal JS</a>, <a href="http://knockoutjs.com/" target="_blank">Knockout JS</a>, <a href="http://getbootstrap.com/" target="_blank">Bootstrap</a> and <a href="http://isotope.metafizzy.co/" target="_blank">Isotope</a>'}],creativeCommons:'<a rel="license" target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="/Content/images/cc_attribution_nocommercial_88x31.png" /></a>'},activate:i};return a});
define('viewmodels/welcome',["plugins/http","durandal/app","knockout","services/logger","services/photostream","services/blogstream","services/common"],function(e,t,n,i,r,o,a){function s(){return $.when(o.load(a.blogUrl),r.load(a.photoUrl)).then(function(){c(o.partialStream()),u(r.partialStream())})}function l(){a.initializeLazyLoad()}var c=n.observableArray([]),u=n.observableArray([]);return{title:"Welcome!",developerWidget:{title:"Web Developer",description:"A programmer, primarily developing web applications at work and for fun. I love working on the latest and the greatest frameworks and technologies. Here ae some that have grabbed my fancy recently.",thumbUrl:"./Content/images/oneszeroes.jpg",technologies:[{item:"ASP.Net MVC"},{item:"Durandal JS"},{item:"Knockout JS"},{item:"Single Page Applications"},{item:"PHP"},{item:"Wordpress Plugins"}]},photographerWidget:{title:"Photographer",description:'A hobbyist photographer, I enjoy taking pictures of birds in their natural surroundings. I\'m joined by my wife Ann Zubin, who is a photography enthusiast herself. Take a look at <a href="#photos">Ann & Zubin Photography</a> and let us know what you think.'},recentPhotosWidget:{title:"Recent Photos",images:u,footer:'<a href="#photos">more</a>..'},recentPostsWidget:{title:"Recent Posts",items:c,footer:'<a href="#blog">more</a>..'},profileWidget:{title:"Profile",items:[{item:'Solution Architect at <a href="http://www.wipro.com">Wipro</a>'},{item:"Programmer by profession"},{item:"Love reading books"},{item:"Enjoy outdoor activites"},{item:"Bird photography enthusiast"}]},activate:s,compositionComplete:l}});
define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
define('text!views/blog.html',[],function () { return '<section id="blog">\r\n    <!--<h2 data-bind="text: title"></h2>-->\n    <div class="options">\r\n        <ul class="filters list-inline">\r\n            <li class="first"><a class="selected" data-filter="*" href="javascript: void(0);">Show All</a></li>\r\n            <li><a href="javascript: void(0);" data-filter=".programming">Programming</a></li>\r\n            <li><a href="javascript: void(0);" data-filter=".mobile">Mobile</a></li>\r\n            <li><a href="javascript: void(0);" data-filter=".linux">Linux</a></li>\r\n            <li><a href="javascript: void(0);" data-filter=".wordpress">Wordpress</a></li>\r\n        </ul>\r\n    </div>\r\n\r\n    <div class="loading"></div>\r\n\r\n    <div id="blog-container" data-bind="foreach: items, isotope: { itemSelector: \'.blog-item\' }">\r\n        <div class="blog-item" data-bind="css: categories">\r\n            <a data-bind="attr: { href: link }">\r\n                <h3 data-bind="text: title"></h3>\r\n            </a>\r\n            <p data-bind="text: description"></p>\r\n            <small><a data-bind="attr: { href: link }">Read More</a></small>\r\n                \r\n        </div>\r\n    </div>\r\n\r\n</section>';});

define('text!views/contact.html',[],function () { return '<section>\n    <h2 data-bind="text: title"></h2>\n    <table class="table table-striped table-hover" data-bind="foreach: channels">\n        <tr>\n            <td data-bind="text: channel"></td>\n            <td><a data-bind="enable: url.length > 0, attr: { href: url }, text: text"></a></td>\n        </tr>\n    </table>\n\n    <div data-bind="with: license">\n        <h2 data-bind="text: heading"></h2>\n        <p data-bind="html: description"></p>\n    </div>\n    \n    <div data-bind="with: disclaimer">\n        <h2 data-bind="text: heading"></h2>\n        <p data-bind="html: description"></p>\n    </div>    \n</section>';});

define('text!views/error.html',[],function () { return '<section>\n    <h2>Page Not Found</h2>\n    <p>You may have followed a link which is outdated or incorrect. Or we may have screwed up, these things happen.</p>\n\n    <h4>A few things you can try</h4>\n    <ul>\r\n        <li>Use your browser\'s back button to go the previous page you were viewing</li>\r\n        <li>If you accessed this page using a bookmark/favorite, please update the bookmark with the correct link</li>\r\n        <li>Go to the <a href="#">home page</a></li>\r\n        <li>Need help or if you have a question, please <a href="#contact">contact me</a></li>\r\n    </ul>\n</section>\n';});

define('text!views/flickr.html',[],function () { return '<section>\n    <div class="row">\n        <ul class="list-inline" data-bind="foreach: images">\n            <li>\n                <a href="#" class="thumbnail" data-bind="click: $parent.select">\n                    <img style="width: 260px; height: 180px;" data-bind="attr: { src: media.m }"/>\n                    <span data-bind="text: title"></span>\n                    <span data-bind="text: tags"></span>\n                </a>\n            </li>\n        </ul>\n    </div>\n</section>';});

define('text!views/footer.html',[],function () { return '    <div class="bs-footer" data-bind="with: footer">\n        <small class="text-muted">\n            <p data-bind="html: copyright"></p>\n            <span data-bind="foreach: lines">\n                <p data-bind="html: line"></p>\n            </span>\n        </small>\n        <div class="clearfix"> <p data-bind="html: creativeCommons"></p></div>\n    </div>\n';});

define('text!views/header.html',[],function () { return '    <nav class="navbar navbar-fixed-top navbar-default" role="navigation">\r\n        <div class="navbar-header">\r\n            <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-ex1-collapse">\r\n              <span class="sr-only">Toggle navigation</span>\r\n              <span class="icon-bar"></span>\r\n              <span class="icon-bar"></span>\r\n              <span class="icon-bar"></span>\r\n            </button>\r\n\r\n            <a class="navbar-brand" data-bind="attr: { href: router.navigationModel()[0].hash }">\r\n                <!--<i class="glyphicon glyphicon-leaf"></i>-->\r\n                <span>ZUBINRAJ.COM</span>\r\n            </a>\r\n        </div>\r\n        <div class="collapse navbar-collapse navbar-ex1-collapse">\r\n            <ul class="nav navbar-nav" data-bind="foreach: router.navigationModel">\r\n                <li data-bind="css: { active: isActive }">\r\n                    <a data-bind="attr: { href: hash }">\r\n                        <i class="glyphicon" data-bind="css: icon"></i>\r\n                        <span data-bind="text: title"></span>\r\n                    </a>\r\n                </li>\r\n            </ul>\r\n        \r\n            <div class="loader pull-right" data-bind="css: { active: router.isNavigating }">\r\n                <i class="icon-spinner icon-2x icon-spin"></i>\r\n            </div>\r\n        </div>        \r\n    </nav>\r\n';});

define('text!views/license.html',[],function () { return '<section>\n    <h2 data-bind="text: title"></h2>\n    <p data-bind="html: description"></p>\n    <div class="pull-left" style="width: 200px;">\n        <ul data-bind="foreach: terms">\n            <li data-bind="text: term"></li>\n        </ul>\n    </div>\n\n    <div class="clearfix"> <p data-bind="html: creativeCommons"></p></div>\n\n    <p data-bind="text: termsOverride"></p>\n\n    <div data-bind="with: commercial">\r\n        <h2 data-bind="text: heading"></h2>\n        <p data-bind="html: description"></p>\n    </div>\n\n    <div data-bind="with: thirdParty">\n        <h2 data-bind="text: heading"></h2>\n        <p data-bind="html: description"></p>\n        <table class="table table-striped table-hover" data-bind="foreach: libraries">\n            <tr> \n                <td data-bind="text: library"></td>\n                <td data-bind="text: license"></td>\n                <td><a data-bind="attr: { href: url }, text: url" target="_blank"></a></td>\n            </tr>\n        </table>\n    </div>\n</section>';});

define('text!views/photos.html',[],function () { return '<section id="gallery">\n    <!--<h2 data-bind="text: title"></h2>-->\n    <div class="options">\n        <ul class="filters list-inline">\n            <li class="first"><a class="selected" data-filter="*" href="javascript: void(0);">Show All</a></li>\n            <li><a href="javascript: void(0);" data-filter=".people">People</a></li>\n            <li><a href="javascript: void(0);" data-filter=".places">Places</a></li>\n            <li><a href="javascript: void(0);" data-filter=".bird">Birds</a></li>\n            <li><a href="javascript: void(0);" data-filter=".portfolio">Portfolio</a></li>\n        </ul>\n    </div>\n\r\n    <div class="loading"></div>\r\n\n    <div id="gallery-container"  class="list-inline" data-bind="foreach: images, isotope: { itemSelector: \'.gallery-item\' }">\n        <div class="gallery-item" data-bind="css: categories, style: { height: thumbHeight, width: thumbWidth }">\n            <a class="fancybox-thumb" rel="gallery" data-bind="attr: { href: originalUrl }">\n                <img class="lazy" src="/Content/images/grey.gif" data-bind="attr: { \'data-original\': thumbUrl, title: title, alt: title, height: thumbHeight, width: thumbWidth }"/>\n                <!--<span data-bind="text: title"></span>-->\n            </a>\n        </div>\n    </div>\n</section>';});

define('text!views/shell.html',[],function () { return '<div>\n    <header data-bind="compose: { view: \'header\' }"></header>\n    \n    <div class="container" data-bind="router: { transition:\'entrance\', cacheViews:true }"></div>\n\n    <footer data-bind="compose: { view: \'footer\' }"></footer>\n\n</div>';});

define('text!views/welcome.html',[],function () { return '    <section id="welcome">\n    <div class="jumbotron">\r\n        <div class="container">\r\n            <h2 data-bind="html: title"></h2>\n            <p></p>\r\n        </div>\r\n    </div>\n    <div class="col-sm-4">\r\n        <div class="widget" data-bind="with: developerWidget">\r\n            <h3 data-bind="text: title"></h3>\r\n            <p data-bind="html: description"></p>\r\n            <ul class="list-unstyled" data-bind="foreach: technologies">\r\n                <script src="../services/common.js"></script>\r\n                <li><i class="glyphicon glyphicon-ok" style="color:green"></i>&nbsp;<span data-bind="text: item"></span></li>\r\n            </ul>\r\n        </div>\r\n        <div class="widget" data-bind="with: profileWidget">\r\n            <h3 data-bind="text: title"></h3>\r\n            <ul class="list-unstyled" data-bind="foreach: items">\r\n                <li><i class="glyphicon glyphicon-ok" style="color:green"></i>&nbsp;<span data-bind="html: item"></span></li>\r\n            </ul>\r\n        </div>\r\n    </div>\r\n    <div class="col-sm-4">\r\n        <div class="widget" data-bind="with: recentPostsWidget">\r\n            <h3 data-bind="text: title"></h3>\r\n            <ul class="list-unstyled" data-bind="foreach: items">\r\n                <li class="list-items"><a data-bind="attr: { href: link }, text: title"></a></li>\r\n            </ul>\r\n            <div data-bind="html: footer"></div>\r\n        </div>\r\n    </div>\r\n    <div class="col-sm-4">\r\n        <div class="widget" data-bind="with: photographerWidget">\r\n            <h3 data-bind="text: title"></h3>\r\n            <p data-bind="html: description"></p>\r\n        </div>\r\n        <div class="widget" data-bind="with: recentPhotosWidget">\r\n            <h3 data-bind="text: title"></h3>\r\n            <div data-bind="foreach: images">\r\n                <div><a><img class="img img-thumbnail lazy" src="/Content/images/grey.gif" data-bind="attr: { \'data-original\': thumbUrl, alt: title, height: thumbHeight, width: thumbWidth }" /></a></div>\r\n            </div>\r\n            <div data-bind="html: footer"></div>\r\n        </div>\r\n    </div>\r\n\n</section>';});

define('plugins/dialog',["durandal/system","durandal/app","durandal/composition","durandal/activator","durandal/viewEngine","jquery","knockout"],function(e,t,n,i,r,o,a){function s(t){return e.defer(function(n){e.isString(t)?e.acquire(t).then(function(t){n.resolve(e.resolveObject(t))}).fail(function(n){e.error("Failed to load dialog module ("+t+"). Details: "+n.message)}):n.resolve(t)}).promise()}var l,c={},u=0,d=function(e,t,n){this.message=e,this.title=t||d.defaultTitle,this.options=n||d.defaultOptions};return d.prototype.selectOption=function(e){l.close(this,e)},d.prototype.getView=function(){return r.processMarkup(d.defaultViewMarkup)},d.setViewUrl=function(e){delete d.prototype.getView,d.prototype.viewUrl=e},d.defaultTitle=t.title||"Application",d.defaultOptions=["Ok"],d.defaultViewMarkup=['<div data-view="plugins/messageBox" class="messageBox">','<div class="modal-header">','<h3 data-bind="text: title"></h3>',"</div>",'<div class="modal-body">','<p class="message" data-bind="text: message"></p>',"</div>",'<div class="modal-footer" data-bind="foreach: options">','<button class="btn" data-bind="click: function () { $parent.selectOption($data); }, text: $data, css: { \'btn-primary\': $index() == 0, autofocus: $index() == 0 }"></button>',"</div>","</div>"].join("\n"),l={MessageBox:d,currentZIndex:1050,getNextZIndex:function(){return++this.currentZIndex},isOpen:function(){return u>0},getContext:function(e){return c[e||"default"]},addContext:function(e,t){t.name=e,c[e]=t;var n="show"+e.substr(0,1).toUpperCase()+e.substr(1);this[n]=function(t,n){return this.show(t,n,e)}},createCompositionSettings:function(e,t){var n={model:e,activate:!1};return t.attached&&(n.attached=t.attached),t.compositionComplete&&(n.compositionComplete=t.compositionComplete),n},getDialog:function(e){return e?e.__dialog__:void 0},close:function(e){var t=this.getDialog(e);if(t){var n=Array.prototype.slice.call(arguments,1);t.close.apply(t,n)}},show:function(t,r,o){var a=this,l=c[o||"default"];return e.defer(function(e){s(t).then(function(t){var o=i.create();o.activateItem(t,r).then(function(i){if(i){var r=t.__dialog__={owner:t,context:l,activator:o,close:function(){var n=arguments;o.deactivateItem(t,!0).then(function(i){i&&(u--,l.removeHost(r),delete t.__dialog__,0==n.length?e.resolve():1==n.length?e.resolve(n[0]):e.resolve.apply(e,n))})}};r.settings=a.createCompositionSettings(t,l),l.addHost(r),u++,n.compose(r.host,r.settings)}else e.resolve(!1)})})}).promise()},showMessage:function(t,n,i){return e.isString(this.MessageBox)?l.show(this.MessageBox,[t,n||d.defaultTitle,i||d.defaultOptions]):l.show(new this.MessageBox(t,n,i))},install:function(e){t.showDialog=function(e,t,n){return l.show(e,t,n)},t.showMessage=function(e,t,n){return l.showMessage(e,t,n)},e.messageBox&&(l.MessageBox=e.messageBox),e.messageBoxView&&(l.MessageBox.prototype.getView=function(){return e.messageBoxView})}},l.addContext("default",{blockoutOpacity:.2,removeDelay:200,addHost:function(e){var t=o("body"),n=o('<div class="modalBlockout"></div>').css({"z-index":l.getNextZIndex(),opacity:this.blockoutOpacity}).appendTo(t),i=o('<div class="modalHost"></div>').css({"z-index":l.getNextZIndex()}).appendTo(t);if(e.host=i.get(0),e.blockout=n.get(0),!l.isOpen()){e.oldBodyMarginRight=t.css("margin-right"),e.oldInlineMarginRight=t.get(0).style.marginRight;var r=o("html"),a=t.outerWidth(!0),s=r.scrollTop();o("html").css("overflow-y","hidden");var c=o("body").outerWidth(!0);t.css("margin-right",c-a+parseInt(e.oldBodyMarginRight)+"px"),r.scrollTop(s)}},removeHost:function(e){if(o(e.host).css("opacity",0),o(e.blockout).css("opacity",0),setTimeout(function(){a.removeNode(e.host),a.removeNode(e.blockout)},this.removeDelay),!l.isOpen()){var t=o("html"),n=t.scrollTop();t.css("overflow-y","").scrollTop(n),e.oldInlineMarginRight?o("body").css("margin-right",e.oldBodyMarginRight):o("body").css("margin-right","")}},compositionComplete:function(e,t,n){var i=o(e),r=i.width(),a=i.height(),s=l.getDialog(n.model);i.css({"margin-top":(-a/2).toString()+"px","margin-left":(-r/2).toString()+"px"}),o(s.host).css("opacity",1),o(e).hasClass("autoclose")&&o(s.blockout).click(function(){s.close()}),o(".autofocus",e).each(function(){o(this).focus()})}}),l});
define('plugins/observable',["durandal/system","durandal/binder","knockout"],function(e,t,n){function i(e){var t=e[0];return"_"===t||"$"===t}function r(t){if(!t||e.isElement(t)||t.ko===n||t.jquery)return!1;var i=d.call(t);return-1==f.indexOf(i)&&!(t===!0||t===!1)}function o(e,t){var n=e.__observable__,i=!0;if(!n||!n.__full__){n=n||(e.__observable__={}),n.__full__=!0,v.forEach(function(n){e[n]=function(){i=!1;var e=m[n].apply(t,arguments);return i=!0,e}}),g.forEach(function(n){e[n]=function(){i&&t.valueWillMutate();var r=p[n].apply(e,arguments);return i&&t.valueHasMutated(),r}}),h.forEach(function(n){e[n]=function(){for(var r=0,o=arguments.length;o>r;r++)a(arguments[r]);i&&t.valueWillMutate();var s=p[n].apply(e,arguments);return i&&t.valueHasMutated(),s}}),e.splice=function(){for(var n=2,r=arguments.length;r>n;n++)a(arguments[n]);i&&t.valueWillMutate();var o=p.splice.apply(e,arguments);return i&&t.valueHasMutated(),o};for(var r=0,o=e.length;o>r;r++)a(e[r])}}function a(t){var a,s;if(r(t)&&(a=t.__observable__,!a||!a.__full__)){if(a=a||(t.__observable__={}),a.__full__=!0,e.isArray(t)){var c=n.observableArray(t);o(t,c)}else for(var u in t)i(u)||a[u]||(s=t[u],e.isFunction(s)||l(t,u,s));b&&e.log("Converted",t)}}function s(e,t,n){var i;e(t),i=e.peek(),n?i.destroyAll||(i||(i=[],e(i)),o(i,e)):a(i)}function l(t,i,r){var l,c,u=t.__observable__||(t.__observable__={});if(void 0===r&&(r=t[i]),e.isArray(r))l=n.observableArray(r),o(r,l),c=!0;else if("function"==typeof r){if(!n.isObservable(r))return null;l=r}else e.isPromise(r)?(l=n.observable(),r.then(function(t){if(e.isArray(t)){var i=n.observableArray(t);o(t,i),t=i}l(t)})):(l=n.observable(r),a(r));return Object.defineProperty(t,i,{configurable:!0,enumerable:!0,get:l,set:n.isWriteableObservable(l)?function(t){t&&e.isPromise(t)?t.then(function(t){s(l,t,e.isArray(t))}):s(l,t,c)}:void 0}),u[i]=l,l}function c(t,n,i){var r,o=this,a={owner:t,deferEvaluation:!0};return"function"==typeof i?a.read=i:("value"in i&&e.error('For ko.defineProperty, you must not specify a "value" for the property. You must provide a "get" function.'),"function"!=typeof i.get&&e.error('For ko.defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".'),a.read=i.get,a.write=i.set),r=o.computed(a),t[n]=r,l(t,n,r)}var u,d=Object.prototype.toString,f=["[object Function]","[object String]","[object Boolean]","[object Number]","[object Date]","[object RegExp]"],v=["remove","removeAll","destroy","destroyAll","replace"],g=["pop","reverse","sort","shift","splice"],h=["push","unshift"],p=Array.prototype,m=n.observableArray.fn,b=!1;return u=function(e,t){var i,r,o;return e?(i=e.__observable__,i&&(r=i[t])?r:(o=e[t],n.isObservable(o)?o:l(e,t,o))):null},u.defineProperty=c,u.convertProperty=l,u.convertObject=a,u.install=function(e){var n=t.binding;t.binding=function(e,t,i){i.applyBindings&&!i.skipConversion&&a(e),n(e,t)},b=e.logConversion},u});
define('plugins/serializer',["durandal/system"],function(e){return{typeAttribute:"type",space:void 0,replacer:function(e,t){if(e){var n=e[0];if("_"===n||"$"===n)return void 0}return t},serialize:function(t,n){return n=void 0===n?{}:n,(e.isString(n)||e.isNumber(n))&&(n={space:n}),JSON.stringify(t,n.replacer||this.replacer,n.space||this.space)},getTypeId:function(e){return e?e[this.typeAttribute]:void 0},typeMap:{},registerType:function(){var t=arguments[0];if(1==arguments.length){var n=t[this.typeAttribute]||e.getModuleId(t);this.typeMap[n]=t}else this.typeMap[t]=arguments[1]},reviver:function(e,t,n,i){var r=n(t);if(r){var o=i(r);if(o)return o.fromJSON?o.fromJSON(t):new o(t)}return t},deserialize:function(e,t){var n=this;t=t||{};var i=t.getTypeId||function(e){return n.getTypeId(e)},r=t.getConstructor||function(e){return n.typeMap[e]},o=t.reviver||function(e,t){return n.reviver(e,t,i,r)};return JSON.parse(e,o)}}});
define('plugins/widget',["durandal/system","durandal/composition","jquery","knockout"],function(e,t,n,i){function r(e,n){var r=i.utils.domData.get(e,l);r||(r={parts:t.cloneNodes(i.virtualElements.childNodes(e))},i.virtualElements.emptyNode(e),i.utils.domData.set(e,l,r)),n.parts=r.parts}var o={},a={},s=["model","view","kind"],l="durandal-widget-data",c={getSettings:function(t){var n=i.utils.unwrapObservable(t())||{};if(e.isString(n))return{kind:n};for(var r in n)n[r]=-1!=i.utils.arrayIndexOf(s,r)?i.utils.unwrapObservable(n[r]):n[r];return n},registerKind:function(e){i.bindingHandlers[e]={init:function(){return{controlsDescendantBindings:!0}},update:function(t,n,i,o,a){var s=c.getSettings(n);s.kind=e,r(t,s),c.create(t,s,a,!0)}},i.virtualElements.allowedBindings[e]=!0},mapKind:function(e,t,n){t&&(a[e]=t),n&&(o[e]=n)},mapKindToModuleId:function(e){return o[e]||c.convertKindToModulePath(e)},convertKindToModulePath:function(e){return"widgets/"+e+"/viewmodel"},mapKindToViewId:function(e){return a[e]||c.convertKindToViewPath(e)},convertKindToViewPath:function(e){return"widgets/"+e+"/view"},createCompositionSettings:function(e,t){return t.model||(t.model=this.mapKindToModuleId(t.kind)),t.view||(t.view=this.mapKindToViewId(t.kind)),t.preserveContext=!0,t.activate=!0,t.activationData=t,t.mode="templated",t},create:function(e,n,i,r){r||(n=c.getSettings(function(){return n},e));var o=c.createCompositionSettings(e,n);t.compose(e,o,i)},install:function(e){if(e.bindingName=e.bindingName||"widget",e.kinds)for(var t=e.kinds,n=0;n<t.length;n++)c.registerKind(t[n]);i.bindingHandlers[e.bindingName]={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,i,o){var a=c.getSettings(t);r(e,a),c.create(e,a,o,!0)}},i.virtualElements.allowedBindings[e.bindingName]=!0}};return c});
define('transitions/entrance',["durandal/system","durandal/composition","jquery"],function(e,t,n){var i=100,r={marginRight:0,marginLeft:0,opacity:1},o={marginLeft:"",marginRight:"",opacity:"",display:""},a=function(t){return e.defer(function(e){function a(){e.resolve()}function s(){t.keepScrollPosition||n(document).scrollTop(0)}function l(){s(),t.triggerAttach();var e={marginLeft:u?"0":"20px",marginRight:u?"0":"-20px",opacity:0,display:"block"},i=n(t.child);i.css(e),i.animate(r,c,"swing",function(){i.css(o),a()})}if(t.child){var c=t.duration||500,u=!!t.fadeOnly;t.activeView?n(t.activeView).fadeOut(i,l):l()}else n(t.activeView).fadeOut(i,a)}).promise()};return a});
require(["main"]);
}());