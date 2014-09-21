(function () {
/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
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
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

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
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
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
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
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
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
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
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../Scripts/almond-custom", function(){});

define('durandal/system',["require","jquery"],function(e,t){function n(e){var t="[object "+e+"]";i["is"+e]=function(e){return s.call(e)==t}}var i,r=!1,o=Object.keys,a=Object.prototype.hasOwnProperty,s=Object.prototype.toString,c=!1,l=Array.isArray,u=Array.prototype.slice;if(String.prototype.trim||(String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g,"")}),Function.prototype.bind&&("object"==typeof console||"function"==typeof console)&&"object"==typeof console.log)try{["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach(function(e){console[e]=this.call(console[e],console)},Function.prototype.bind)}catch(d){c=!0}e.on&&e.on("moduleLoaded",function(e,t){i.setModuleId(e,t)}),"undefined"!=typeof requirejs&&(requirejs.onResourceLoad=function(e,t){i.setModuleId(e.defined[t.id],t.id)});var f=function(){},g=function(){try{if("undefined"!=typeof console&&"function"==typeof console.log)if(window.opera)for(var e=0;e<arguments.length;)console.log("Item "+(e+1)+": "+arguments[e]),e++;else 1==u.call(arguments).length&&"string"==typeof u.call(arguments)[0]?console.log(u.call(arguments).toString()):console.log.apply(console,u.call(arguments));else Function.prototype.bind&&!c||"undefined"==typeof console||"object"!=typeof console.log||Function.prototype.call.call(console.log,console,u.call(arguments))}catch(t){}},p=function(e,t){var n;n=e instanceof Error?e:new Error(e),n.innerError=t;try{"undefined"!=typeof console&&"function"==typeof console.error?console.error(n):Function.prototype.bind&&!c||"undefined"==typeof console||"object"!=typeof console.error||Function.prototype.call.call(console.error,console,n)}catch(i){}throw n};i={version:"2.1.0",noop:f,getModuleId:function(e){return e?"function"==typeof e&&e.prototype?e.prototype.__moduleId__:"string"==typeof e?null:e.__moduleId__:null},setModuleId:function(e,t){return e?"function"==typeof e&&e.prototype?(e.prototype.__moduleId__=t,void 0):("string"!=typeof e&&(e.__moduleId__=t),void 0):void 0},resolveObject:function(e){return i.isFunction(e)?new e:e},debug:function(e){return 1==arguments.length&&(r=e,r?(this.log=g,this.error=p,this.log("Debug:Enabled")):(this.log("Debug:Disabled"),this.log=f,this.error=f)),r},log:f,error:f,assert:function(e,t){e||i.error(new Error(t||"Assert:Failed"))},defer:function(e){return t.Deferred(e)},guid:function(){var e=(new Date).getTime();return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(t){var n=0|(e+16*Math.random())%16;return e=Math.floor(e/16),("x"==t?n:8|7&n).toString(16)})},acquire:function(){var t,n=arguments[0],r=!1;return i.isArray(n)?(t=n,r=!0):t=u.call(arguments,0),this.defer(function(n){e(t,function(){var e=arguments;setTimeout(function(){e.length>1||r?n.resolve(u.call(e,0)):n.resolve(e[0])},1)},function(e){n.reject(e)})}).promise()},extend:function(e){for(var t=u.call(arguments,1),n=0;n<t.length;n++){var i=t[n];if(i)for(var r in i)e[r]=i[r]}return e},wait:function(e){return i.defer(function(t){setTimeout(t.resolve,e)}).promise()}},i.keys=o||function(e){if(e!==Object(e))throw new TypeError("Invalid object");var t=[];for(var n in e)a.call(e,n)&&(t[t.length]=n);return t},i.isElement=function(e){return!(!e||1!==e.nodeType)},i.isArray=l||function(e){return"[object Array]"==s.call(e)},i.isObject=function(e){return e===Object(e)},i.isBoolean=function(e){return"boolean"==typeof e},i.isPromise=function(e){return e&&i.isFunction(e.then)};for(var v=["Arguments","Function","String","Number","Date","RegExp"],h=0;h<v.length;h++)n(v[h]);return i});
define('durandal/viewEngine',["durandal/system","jquery"],function(e,t){var n;return n=t.parseHTML?function(e){return t.parseHTML(e)}:function(e){return t(e).get()},{cache:{},viewExtension:".html",viewPlugin:"text",viewPluginParameters:"",isViewUrl:function(e){return-1!==e.indexOf(this.viewExtension,e.length-this.viewExtension.length)},convertViewUrlToViewId:function(e){return e.substring(0,e.length-this.viewExtension.length)},convertViewIdToRequirePath:function(e){var t=this.viewPlugin?this.viewPlugin+"!":"";return t+e+this.viewExtension+this.viewPluginParameters},parseMarkup:n,processMarkup:function(e){var t=this.parseMarkup(e);return this.ensureSingleElement(t)},ensureSingleElement:function(e){if(1==e.length)return e[0];for(var n=[],i=0;i<e.length;i++){var r=e[i];if(8!=r.nodeType){if(3==r.nodeType){var o=/\S/.test(r.nodeValue);if(!o)continue}n.push(r)}}return n.length>1?t(n).wrapAll('<div class="durandal-wrapper"></div>').parent().get(0):n[0]},tryGetViewFromCache:function(e){return this.cache[e]},putViewInCache:function(e,t){this.cache[e]=t},createView:function(t){var n=this,i=this.convertViewIdToRequirePath(t),r=this.tryGetViewFromCache(i);return r?e.defer(function(e){e.resolve(r.cloneNode(!0))}).promise():e.defer(function(r){e.acquire(i).then(function(e){var o=n.processMarkup(e);o.setAttribute("data-view",t),n.putViewInCache(i,o),r.resolve(o.cloneNode(!0))}).fail(function(e){n.createFallbackView(t,i,e).then(function(e){e.setAttribute("data-view",t),n.cache[i]=e,r.resolve(e.cloneNode(!0))})})}).promise()},createFallbackView:function(t,n){var i=this,r='View Not Found. Searched for "'+t+'" via path "'+n+'".';return e.defer(function(e){e.resolve(i.processMarkup('<div class="durandal-view-404">'+r+"</div>"))}).promise()}}});
define('durandal/viewLocator',["durandal/system","durandal/viewEngine"],function(e,t){function n(e,t){for(var n=0;n<e.length;n++){var i=e[n],r=i.getAttribute("data-view");if(r==t)return i}}function i(e){return(e+"").replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g,"\\$1")}return{useConvention:function(e,t,n){e=e||"viewmodels",t=t||"views",n=n||t;var r=new RegExp(i(e),"gi");this.convertModuleIdToViewId=function(e){return e.replace(r,t)},this.translateViewIdToArea=function(e,t){return t&&"partial"!=t?n+"/"+t+"/"+e:n+"/"+e}},locateViewForObject:function(t,n,i){var r;if(t.getView&&(r=t.getView()))return this.locateView(r,n,i);if(t.viewUrl)return this.locateView(t.viewUrl,n,i);var o=e.getModuleId(t);return o?this.locateView(this.convertModuleIdToViewId(o),n,i):this.locateView(this.determineFallbackViewId(t),n,i)},convertModuleIdToViewId:function(e){return e},determineFallbackViewId:function(e){var t=/function (.{1,})\(/,n=t.exec(e.constructor.toString()),i=n&&n.length>1?n[1]:"";return i=i.trim(),"views/"+i},translateViewIdToArea:function(e){return e},locateView:function(i,r,o){if("string"==typeof i){var a;if(a=t.isViewUrl(i)?t.convertViewUrlToViewId(i):i,r&&(a=this.translateViewIdToArea(a,r)),o){var s=n(o,a);if(s)return e.defer(function(e){e.resolve(s)}).promise()}return t.createView(a)}return e.defer(function(e){e.resolve(i)}).promise()}}});
define('durandal/binder',["durandal/system","knockout"],function(e,t){function n(t){return void 0===t?{applyBindings:!0}:e.isBoolean(t)?{applyBindings:t}:(void 0===t.applyBindings&&(t.applyBindings=!0),t)}function i(i,s,u,d){if(!s||!u)return o.throwOnErrors?e.error(r):e.log(r,s,d),void 0;if(!s.getAttribute)return o.throwOnErrors?e.error(a):e.log(a,s,d),void 0;var f=s.getAttribute("data-view");try{var m;return i&&i.binding&&(m=i.binding(s)),m=n(m),o.binding(d,s,m),m.applyBindings?(e.log("Binding",f,d),t.applyBindings(u,s)):i&&t.utils.domData.set(s,l,{$data:i}),o.bindingComplete(d,s,m),i&&i.bindingComplete&&i.bindingComplete(s),t.utils.domData.set(s,c,m),m}catch(v){v.message=v.message+";\nView: "+f+";\nModuleId: "+e.getModuleId(d),o.throwOnErrors?e.error(v):e.log(v.message)}}var o,r="Insufficient Information to Bind",a="Unexpected View Type",c="durandal-binding-instruction",l="__ko_bindingContext__";return o={binding:e.noop,bindingComplete:e.noop,throwOnErrors:!1,getBindingInstruction:function(e){return t.utils.domData.get(e,c)},bindContext:function(e,t,n,o){return n&&e&&(e=e.createChildContext(n,"string"==typeof o?o:null)),i(n,t,e,n||(e?e.$data:null))},bind:function(e,t){return i(e,t,e,e)}}});
define('durandal/activator',["durandal/system","knockout"],function(e,t){function i(t){return void 0==t&&(t={}),e.isBoolean(t.closeOnDeactivate)||(t.closeOnDeactivate=l.defaults.closeOnDeactivate),t.beforeActivate||(t.beforeActivate=l.defaults.beforeActivate),t.afterDeactivate||(t.afterDeactivate=l.defaults.afterDeactivate),t.affirmations||(t.affirmations=l.defaults.affirmations),t.interpretResponse||(t.interpretResponse=l.defaults.interpretResponse),t.areSameItem||(t.areSameItem=l.defaults.areSameItem),t.findChildActivator||(t.findChildActivator=l.defaults.findChildActivator),t}function n(t,i,n){return e.isArray(n)?t[i].apply(t,n):t[i](n)}function o(t,i,n,o,a){if(t&&t.deactivate){e.log("Deactivating",t);var r;try{r=t.deactivate(i)}catch(c){return e.log("ERROR: "+c.message,c),o.resolve(!1),void 0}r&&r.then?r.then(function(){n.afterDeactivate(t,i,a),o.resolve(!0)},function(t){e.log(t),o.resolve(!1)}):(n.afterDeactivate(t,i,a),o.resolve(!0))}else t&&n.afterDeactivate(t,i,a),o.resolve(!0)}function a(t,i,o,a){var r;if(t&&t.activate){e.log("Activating",t);try{r=n(t,"activate",a)}catch(c){return e.log("ERROR: "+c.message,c),o(!1),void 0}}r&&r.then?r.then(function(){i(t),o(!0)},function(t){e.log("ERROR: "+t.message,t),o(!1)}):(i(t),o(!0))}function r(t,i,n,o){return o=e.extend({},u,o),n.lifecycleData=null,e.defer(function(a){function r(){if(t&&t.canDeactivate&&o.canDeactivate){var r;try{r=t.canDeactivate(i)}catch(c){return e.log("ERROR: "+c.message,c),a.resolve(!1),void 0}r.then?r.then(function(e){n.lifecycleData=e,a.resolve(n.interpretResponse(e))},function(t){e.log("ERROR: "+t.message,t),a.resolve(!1)}):(n.lifecycleData=r,a.resolve(n.interpretResponse(r)))}else a.resolve(!0)}var c=n.findChildActivator(t);c?c.canDeactivate().then(function(e){e?r():a.resolve(!1)}):r()}).promise()}function c(t,i,o,a,r){return o.lifecycleData=null,e.defer(function(c){if(o.areSameItem(i(),t,a,r))return c.resolve(!0),void 0;if(t&&t.canActivate){var s;try{s=n(t,"canActivate",r)}catch(l){return e.log("ERROR: "+l.message,l),c.resolve(!1),void 0}s.then?s.then(function(e){o.lifecycleData=e,c.resolve(o.interpretResponse(e))},function(t){e.log("ERROR: "+t.message,t),c.resolve(!1)}):(o.lifecycleData=s,c.resolve(o.interpretResponse(s)))}else c.resolve(!0)}).promise()}function s(n,s){var l,u=t.observable(null);s=i(s);var d=t.computed({read:function(){return u()},write:function(e){d.viaSetter=!0,d.activateItem(e)}});return d.__activator__=!0,d.settings=s,s.activator=d,d.isActivating=t.observable(!1),d.forceActiveItem=function(e){u(e)},d.canDeactivateItem=function(e,t,i){return r(e,t,s,i)},d.deactivateItem=function(t,i){return e.defer(function(e){d.canDeactivateItem(t,i).then(function(n){n?o(t,i,s,e,u):(d.notifySubscribers(),e.resolve(!1))})}).promise()},d.canActivateItem=function(e,t){return c(e,u,s,l,t)},d.activateItem=function(t,i,n){var r=d.viaSetter;return d.viaSetter=!1,e.defer(function(c){if(d.isActivating())return c.resolve(!1),void 0;d.isActivating(!0);var f=u();return s.areSameItem(f,t,l,i)?(d.isActivating(!1),c.resolve(!0),void 0):(d.canDeactivateItem(f,s.closeOnDeactivate,n).then(function(n){n?d.canActivateItem(t,i).then(function(n){n?e.defer(function(e){o(f,s.closeOnDeactivate,s,e)}).promise().then(function(){t=s.beforeActivate(t,i),a(t,u,function(e){l=i,d.isActivating(!1),c.resolve(e)},i)}):(r&&d.notifySubscribers(),d.isActivating(!1),c.resolve(!1))}):(r&&d.notifySubscribers(),d.isActivating(!1),c.resolve(!1))}),void 0)}).promise()},d.canActivate=function(){var e;return n?(e=n,n=!1):e=d(),d.canActivateItem(e)},d.activate=function(){var e;return n?(e=n,n=!1):e=d(),d.activateItem(e)},d.canDeactivate=function(e){return d.canDeactivateItem(d(),e)},d.deactivate=function(e){return d.deactivateItem(d(),e)},d.includeIn=function(e){e.canActivate=function(){return d.canActivate()},e.activate=function(){return d.activate()},e.canDeactivate=function(e){return d.canDeactivate(e)},e.deactivate=function(e){return d.deactivate(e)}},s.includeIn?d.includeIn(s.includeIn):n&&d.activate(),d.forItems=function(t){s.closeOnDeactivate=!1,s.determineNextItemToActivate=function(e,t){var i=t-1;return-1==i&&e.length>1?e[1]:i>-1&&i<e.length-1?e[i]:null},s.beforeActivate=function(e){var i=d();if(e){var n=t.indexOf(e);-1==n?t.push(e):e=t()[n]}else e=s.determineNextItemToActivate(t,i?t.indexOf(i):0);return e},s.afterDeactivate=function(e,i){i&&t.remove(e)};var i=d.canDeactivate;d.canDeactivate=function(n){return n?e.defer(function(e){function i(){for(var t=0;t<a.length;t++)if(!a[t])return e.resolve(!1),void 0;e.resolve(!0)}for(var o=t(),a=[],r=0;r<o.length;r++)d.canDeactivateItem(o[r],n).then(function(e){a.push(e),a.length==o.length&&i()})}).promise():i()};var n=d.deactivate;return d.deactivate=function(i){return i?e.defer(function(e){function n(n){setTimeout(function(){d.deactivateItem(n,i).then(function(){a++,t.remove(n),a==r&&e.resolve()})},1)}for(var o=t(),a=0,r=o.length,c=0;r>c;c++)n(o[c])}).promise():n()},d},d}var l,u={canDeactivate:!0},d={closeOnDeactivate:!0,affirmations:["yes","ok","true"],interpretResponse:function(i){return e.isObject(i)&&(i=i.can||!1),e.isString(i)?-1!==t.utils.arrayIndexOf(this.affirmations,i.toLowerCase()):i},areSameItem:function(e,t){return e==t},beforeActivate:function(e){return e},afterDeactivate:function(e,t,i){t&&i&&i(null)},findChildActivator:function(){return null}};return l={defaults:d,create:s,isActivator:function(e){return e&&e.__activator__}}});
define('durandal/composition',["durandal/system","durandal/viewLocator","durandal/binder","durandal/viewEngine","durandal/activator","jquery","knockout"],function(e,t,i,n,o,a,r){function c(t,i,n){try{if(t.onError)try{t.onError(i,n)}catch(o){e.error(o)}else e.error(i)}finally{s(t,n,!0)}}function l(e){for(var t=[],i={childElements:t,activeView:null},n=r.virtualElements.firstChild(e);n;)1==n.nodeType&&(t.push(n),n.getAttribute(D)&&(i.activeView=n)),n=r.virtualElements.nextSibling(n);return i.activeView||(i.activeView=t[0]),i}function s(e,t,i){if(S--,0===S){var n=x;x=[],i||setTimeout(function(){for(var i=n.length;i--;)try{n[i]()}catch(o){c(e,o,t)}},1)}u(e)}function u(e){delete e.activeView,delete e.viewElements}function d(t,i,n,o){if(n)i();else if(t.activate&&t.model&&t.model.activate){var a;try{a=e.isArray(t.activationData)?t.model.activate.apply(t.model,t.activationData):t.model.activate(t.activationData),a&&a.then?a.then(i,function(e){c(t,e,o),i()}):a||void 0===a?i():s(t,o)}catch(r){c(t,r,o)}}else i()}function f(t,i){var t=this;if(t.activeView&&t.activeView.removeAttribute(D),t.child)try{t.model&&t.model.attached&&(t.composingNewView||t.alwaysTriggerAttach)&&t.model.attached(t.child,t.parent,t),t.attached&&t.attached(t.child,t.parent,t),t.child.setAttribute(D,!0),t.composingNewView&&t.model&&t.model.detached&&r.utils.domNodeDisposal.addDisposeCallback(t.child,function(){try{t.model.detached(t.child,t.parent,t)}catch(e){c(t,e,i)}})}catch(n){c(t,n,i)}t.triggerAttach=e.noop}function v(t){if(e.isString(t.transition)){if(t.activeView){if(t.activeView==t.child)return!1;if(!t.child)return!0;if(t.skipTransitionOnSameViewId){var i=t.activeView.getAttribute("data-view"),n=t.child.getAttribute("data-view");return i!=n}}return!0}return!1}function m(e){for(var t=0,i=e.length,n=[];i>t;t++){var o=e[t].cloneNode(!0);n.push(o)}return n}function g(t){var i=m(t.parts),n=w.getParts(i),o=w.getParts(t.child);for(var r in n){var c=o[r];c||(c=a('[data-part="'+r+'"]',t.child).get(0))?c.parentNode.replaceChild(n[r],c):e.log("Could not find part to override: "+r)}}function h(t){var i,n,o=r.virtualElements.childNodes(t.parent);if(!e.isArray(o)){var a=[];for(i=0,n=o.length;n>i;i++)a[i]=o[i];o=a}for(i=1,n=o.length;n>i;i++)r.removeNode(o[i])}function p(e){r.utils.domData.set(e,E,e.style.display),e.style.display="none"}function b(e){var t=r.utils.domData.get(e,E);e.style.display="none"===t?"block":t}function y(e){var t=e.getAttribute("data-bind");if(!t)return!1;for(var i=0,n=V.length;n>i;i++)if(t.indexOf(V[i])>-1)return!0;return!1}var w,A={},D="data-active-view",x=[],S=0,C="durandal-composition-data",k="data-part",I=["model","view","transition","area","strategy","activationData","onError"],E="durandal-visibility-data",V=["compose:"],_={complete:function(e){x.push(e)}};return w={composeBindings:V,convertTransitionToModuleId:function(e){return"transitions/"+e},defaultTransitionName:null,current:_,addBindingHandler:function(e,t,i){var n,o,a="composition-handler-"+e;t=t||r.bindingHandlers[e],i=i||function(){return void 0},o=r.bindingHandlers[e]={init:function(e,n,o,c,l){if(S>0){var s={trigger:r.observable(null)};w.current.complete(function(){t.init&&t.init(e,n,o,c,l),t.update&&(r.utils.domData.set(e,a,t),s.trigger("trigger"))}),r.utils.domData.set(e,a,s)}else r.utils.domData.set(e,a,t),t.init&&t.init(e,n,o,c,l);return i(e,n,o,c,l)},update:function(e,t,i,n,o){var c=r.utils.domData.get(e,a);return c.update?c.update(e,t,i,n,o):(c.trigger&&c.trigger(),void 0)}};for(n in t)"init"!==n&&"update"!==n&&(o[n]=t[n])},getParts:function(e,t){if(t=t||{},!e)return t;void 0===e.length&&(e=[e]);for(var i=0,n=e.length;n>i;i++){var o,a=e[i];a.getAttribute&&(o=a.getAttribute(k),o&&(t[o]=a),a.hasChildNodes()&&!y(a)&&w.getParts(a.childNodes,t))}return t},cloneNodes:m,finalize:function(t,n){if(void 0===t.transition&&(t.transition=this.defaultTransitionName),t.child||t.activeView)if(v(t)){var o=this.convertTransitionToModuleId(t.transition);e.acquire(o).then(function(e){t.transition=e,e(t).then(function(){if(t.cacheViews){if(t.activeView){var e=i.getBindingInstruction(t.activeView);e&&void 0!=e.cacheViews&&!e.cacheViews?r.removeNode(t.activeView):p(t.activeView)}}else t.child?h(t):r.virtualElements.emptyNode(t.parent);t.child&&b(t.child),t.triggerAttach(t,n),s(t,n)})}).fail(function(e){c(t,"Failed to load transition ("+o+"). Details: "+e.message,n)})}else{if(t.child!=t.activeView){if(t.cacheViews&&t.activeView){var a=i.getBindingInstruction(t.activeView);!a||void 0!=a.cacheViews&&!a.cacheViews?r.removeNode(t.activeView):p(t.activeView)}t.child?(t.cacheViews||h(t),b(t.child)):t.cacheViews||r.virtualElements.emptyNode(t.parent)}t.triggerAttach(t,n),s(t,n)}else t.cacheViews||r.virtualElements.emptyNode(t.parent),t.triggerAttach(t,n),s(t,n)},bindAndShow:function(e,t,o,a){o.child=e,o.parent.__composition_context=o,o.composingNewView=o.cacheViews?-1==r.utils.arrayIndexOf(o.viewElements,e):!0,d(o,function(){if(o.parent.__composition_context==o){if(delete o.parent.__composition_context,o.binding&&o.binding(o.child,o.parent,o),o.preserveContext&&o.bindingContext)o.composingNewView&&(o.parts&&g(o),p(e),r.virtualElements.prepend(o.parent,e),i.bindContext(o.bindingContext,e,o.model,o.as));else if(e){var a=o.model||A,c=r.dataFor(e);if(c!=a){if(!o.composingNewView)return r.removeNode(e),n.createView(e.getAttribute("data-view")).then(function(e){w.bindAndShow(e,t,o,!0)}),void 0;o.parts&&g(o),p(e),r.virtualElements.prepend(o.parent,e),i.bind(a,e)}}w.finalize(o,t)}else s(o,t)},a,t)},defaultStrategy:function(e){return t.locateViewForObject(e.model,e.area,e.viewElements)},getSettings:function(t){var i,a=t(),c=r.utils.unwrapObservable(a)||{},l=o.isActivator(a);if(e.isString(c))return c=n.isViewUrl(c)?{view:c}:{model:c,activate:!l};if(i=e.getModuleId(c))return c={model:c,activate:!l};!l&&c.model&&(l=o.isActivator(c.model));for(var s in c)c[s]=-1!=r.utils.arrayIndexOf(I,s)?r.utils.unwrapObservable(c[s]):c[s];return l?c.activate=!1:void 0===c.activate&&(c.activate=!0),c},executeStrategy:function(e,t){e.strategy(e).then(function(i){w.bindAndShow(i,t,e)})},inject:function(i,n){return i.model?i.view?(t.locateView(i.view,i.area,i.viewElements).then(function(e){w.bindAndShow(e,n,i)}),void 0):(i.strategy||(i.strategy=this.defaultStrategy),e.isString(i.strategy)?e.acquire(i.strategy).then(function(e){i.strategy=e,w.executeStrategy(i,n)}).fail(function(e){c(i,"Failed to load view strategy ("+i.strategy+"). Details: "+e.message,n)}):this.executeStrategy(i,n),void 0):(this.bindAndShow(null,n,i),void 0)},compose:function(i,n,o,a){S++,a||(n=w.getSettings(function(){return n},i)),n.compositionComplete&&x.push(function(){n.compositionComplete(n.child,n.parent,n)}),x.push(function(){n.composingNewView&&n.model&&n.model.compositionComplete&&n.model.compositionComplete(n.child,n.parent,n)});var r=l(i);n.activeView=r.activeView,n.parent=i,n.triggerAttach=f,n.bindingContext=o,n.cacheViews&&!n.viewElements&&(n.viewElements=r.childElements),n.model?e.isString(n.model)?e.acquire(n.model).then(function(t){n.model=e.resolveObject(t),w.inject(n,i)}).fail(function(e){c(n,"Failed to load composed module ("+n.model+"). Details: "+e.message,i)}):w.inject(n,i):n.view?(n.area=n.area||"partial",n.preserveContext=!0,t.locateView(n.view,n.area,n.viewElements).then(function(e){w.bindAndShow(e,i,n)})):this.bindAndShow(null,i,n)}},r.bindingHandlers.compose={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,i,o,a){var c=w.getSettings(t,e);if(c.mode){var l=r.utils.domData.get(e,C);if(!l){var s=r.virtualElements.childNodes(e);l={},"inline"===c.mode?l.view=n.ensureSingleElement(s):"templated"===c.mode&&(l.parts=m(s)),r.virtualElements.emptyNode(e),r.utils.domData.set(e,C,l)}"inline"===c.mode?c.view=l.view.cloneNode(!0):"templated"===c.mode&&(c.parts=l.parts),c.preserveContext=!0}w.compose(e,c,a,!0)}},r.virtualElements.allowedBindings.compose=!0,w});
define('durandal/events',["durandal/system"],function(e){var t=/\s+/,i=function(){},n=function(e,t){this.owner=e,this.events=t};return n.prototype.then=function(e,t){return this.callback=e||this.callback,this.context=t||this.context,this.callback?(this.owner.on(this.events,this.callback,this.context),this):this},n.prototype.on=n.prototype.then,n.prototype.off=function(){return this.owner.off(this.events,this.callback,this.context),this},i.prototype.on=function(e,i,o){var r,a,c;if(i){for(r=this.callbacks||(this.callbacks={}),e=e.split(t);a=e.shift();)c=r[a]||(r[a]=[]),c.push(i,o);return this}return new n(this,e)},i.prototype.off=function(i,n,o){var r,a,c,l;if(!(a=this.callbacks))return this;if(!(i||n||o))return delete this.callbacks,this;for(i=i?i.split(t):e.keys(a);r=i.shift();)if((c=a[r])&&(n||o))for(l=c.length-2;l>=0;l-=2)n&&c[l]!==n||o&&c[l+1]!==o||c.splice(l,2);else delete a[r];return this},i.prototype.trigger=function(e){var i,n,o,r,a,c,l,s;if(!(n=this.callbacks))return this;for(s=[],e=e.split(t),r=1,a=arguments.length;a>r;r++)s[r-1]=arguments[r];for(;i=e.shift();){if((l=n.all)&&(l=l.slice()),(o=n[i])&&(o=o.slice()),o)for(r=0,a=o.length;a>r;r+=2)o[r].apply(o[r+1]||this,s);if(l)for(c=[i].concat(s),r=0,a=l.length;a>r;r+=2)l[r].apply(l[r+1]||this,c)}return this},i.prototype.proxy=function(e){var t=this;return function(i){t.trigger(e,i)}},i.includeIn=function(e){e.on=i.prototype.on,e.off=i.prototype.off,e.trigger=i.prototype.trigger,e.proxy=i.prototype.proxy},i});
define('durandal/app',["durandal/system","durandal/viewEngine","durandal/composition","durandal/events","jquery"],function(e,t,n,i,o){function a(){return e.defer(function(t){return 0==c.length?(t.resolve(),void 0):(e.acquire(c).then(function(n){for(var i=0;i<n.length;i++){var o=n[i];if(o.install){var a=l[i];e.isObject(a)||(a={}),o.install(a),e.log("Plugin:Installed "+c[i])}else e.log("Plugin:Loaded "+c[i])}t.resolve()}).fail(function(t){e.error("Failed to load plugin(s). Details: "+t.message)}),void 0)}).promise()}var r,c=[],l=[];return r={title:"Application",configurePlugins:function(t,n){var i=e.keys(t);n=n||"plugins/",-1===n.indexOf("/",n.length-1)&&(n+="/");for(var o=0;o<i.length;o++){var a=i[o];c.push(n+a),l.push(t[a])}},start:function(){return e.log("Application:Starting"),this.title&&(document.title=this.title),e.defer(function(t){o(function(){a().then(function(){t.resolve(),e.log("Application:Started")})})}).promise()},setRoot:function(i,o,a){function r(){if(l.model)if(l.model.canActivate)try{var t=l.model.canActivate();t&&t.then?t.then(function(e){e&&n.compose(c,l)}).fail(function(t){e.error(t)}):t&&n.compose(c,l)}catch(i){e.error(i)}else n.compose(c,l);else n.compose(c,l)}var c,l={activate:!0,transition:o};c=!a||e.isString(a)?document.getElementById(a||"applicationHost"):a,e.isString(i)?t.isViewUrl(i)?l.view=i:l.model=i:l.model=i,e.isString(l.model)?e.acquire(l.model).then(function(t){l.model=e.resolveObject(t),r()}).fail(function(t){e.error("Failed to load root module ("+l.model+"). Details: "+t.message)}):r()}},i.includeIn(r),r});
define('services/logger',["durandal/system"],function(t){function e(t,e,n){o(t,e,n,"info")}function n(t,e,n){o(t,e,n,"error")}function o(e,n,o,r){n?t.log("",e,n):t.log("",e),o&&("error"===r?toastr.error(e):toastr.info(e))}var r={log:e,logError:n};return r});
requirejs.config({urlArgs:"bust="+(new Date).getTime(),paths:{text:"../Scripts/text",durandal:"../Scripts/durandal",plugins:"../Scripts/durandal/plugins",transitions:"../Scripts/durandal/transitions"}}),define("jquery",[],function(){return jQuery}),define("knockout",ko),define('main',["durandal/system","durandal/app","durandal/viewLocator","services/logger"],function(t,n,o){t.debug(!0),n.title="ZUBINRAJ.COM",n.configurePlugins({router:!0,dialog:!0,widget:!0}),n.start().then(function(){toastr.options.positionClass="toast-bottom-right",toastr.options.backgroundpositionClass="toast-bottom-right",o.useConvention(),n.setRoot("viewmodels/shell","entrance")})});
define('services/blogstream',["durandal/system","durandal/app","knockout","services/logger"],function(t,e,n){function i(t,e,n){if(r().length>0)return e(),void 0;r.removeAll(),a.removeAll();var i={url:t,type:"GET",async:!0,dataType:"xml"};$.ajax(i).done(function(t){var n=$(t);n.find("item").each(function(){var t="",e=$(this);({cat:e.find("category").each(function(){t+=" "+$(this).text().toLowerCase()})});var n=$(this),i={title:n.find("title").text(),link:n.find("link").text(),description:n.find("description").text(),pubDate:n.find("pubDate").text(),author:n.find("author").text(),categories:t};r().push(i)});for(var i=0;10>i&&i<r().length;i++)a().push(r()[i]);e()}).fail(function(){n()})}var r=n.observableArray([]),a=n.observableArray([]),o={stream:r,partialStream:a,load:i};return o});
define('services/common',["durandal/system","durandal/app","knockout","services/logger"],function(){return{blogUrl:"/blog/feed/",photoUrl:"/photos/feed/",blogPartialStreamCount:10,photosPartialStreamCount:3,initializeLazyLoad:function(){$("img.lazy").lazyload({effect:"fadeIn",failure_limit:Math.max($("img").length-1,0)})},initializeFancyBox:function(){$(".fancybox-thumb").fancybox({prevEffect:"none",nextEffect:"none",helpers:{title:{type:"inside"}},beforeShow:function(){$.fancybox.wrap.bind("contextmenu",function(){return!1})}})}}});
define('services/photostream',["durandal/system","durandal/app","knockout","services/logger"],function(t,e,n){function i(t,e,n){if(r().length>0)return e(),void 0;r.removeAll(),a.removeAll();var i={url:t,type:"GET",async:!0,dataType:"xml"};$.ajax(i).done(function(t){var n=$(t);n.find("item").each(function(){var t="",e=$(this);({cat:e.find("category").each(function(){t+=" "+$(this).text().toLowerCase()})});var n=$(this).find("thumb"),i=$(this).find("original"),a=$(this),o={title:a.find("title").text(),link:a.find("link").text(),description:a.find("description").text(),categories:t,pubDate:a.find("pubDate").text(),author:a.find("author").text(),thumbUrl:n.text(),thumbHeight:n.attr("height"),thumbWidth:n.attr("width"),originalUrl:i.text(),originalHeight:i.attr("height"),originalWidth:i.attr("width")};r().push(o)});for(var i=0;3>i&&i<r().length;i++)a().push(r()[i]);e()}).fail(function(){n()})}var r=n.observableArray([]),a=n.observableArray([]),o={stream:r,partialStream:a,load:i};return o});
define('plugins/http',["jquery","knockout"],function(t,e){return{callbackParam:"callback",toJSON:function(t){return e.toJSON(t)},get:function(i,n,o){return t.ajax(i,{data:n,headers:e.toJS(o)})},jsonp:function(i,n,o,a){return-1==i.indexOf("=?")&&(o=o||this.callbackParam,i+=-1==i.indexOf("?")?"?":"&",i+=o+"=?"),t.ajax({url:i,dataType:"jsonp",data:n,headers:e.toJS(a)})},put:function(i,n,o){return t.ajax({url:i,data:this.toJSON(n),type:"PUT",contentType:"application/json",dataType:"json",headers:e.toJS(o)})},post:function(i,n,o){return t.ajax({url:i,data:this.toJSON(n),type:"POST",contentType:"application/json",dataType:"json",headers:e.toJS(o)})},remove:function(i,n,o){return t.ajax({url:i,data:n,type:"DELETE",headers:e.toJS(o)})}}});
define('viewmodels/blog',["plugins/http","knockout","services/logger","services/blogstream","services/common"],function(t,e,n,i,r){function o(){s(),i.load(r.blogUrl,a,l);var t=$("#blog-container");$("#blog .filters a").click(function(){var e=$(this).attr("data-filter");return t.isotope({filter:e}),$(this).toggleClass("selected"),$("#blog .filters a").not(this).removeClass("selected"),!1})}function a(){u(i.stream()),$("#blog-loading").hide()}function l(){n.logError("Data didn't load as expected. Please try again.",null,!0),$("#blog-loading").hide()}function s(){e.bindingHandlers.isotope={init:function(){},update:function(t,n){var i=$(t),r=e.utils.unwrapObservable(n()),o=$(r.container);o.isotope({itemSelector:r.itemSelector}),o.isotope("appended",i)}}}var u=e.observableArray([]),d={title:"Zubin's Web Log",items:u,compositionComplete:o};return d});
define('viewmodels/contact',["services/logger"],function(){var t={title:"Contact",channels:[{channel:"email",text:"support @ zubinraj dot com",url:""},{channel:"twitter",text:"@zubinraj",url:"https://twitter.com/zubinraj"},{channel:"github",text:"https://github.com/zubinraj/",url:"https://github.com/zubinraj/"}],license:{heading:"License",description:'Photos, source code and articles published on this website, that are not explicitly mentioned otherwise, are licensed under <a  target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US">Creative Commons Attribution-NonCommercial 3.0 Unported</a> license. See <a href="#license/">here</a> for more information and details about <a href="#license/">third party licenses</a> used in this website.'},disclaimer:{heading:"Disclaimer",description:'Any source code and opinions provided in this website is provided "as-is" and does not have any warranty or support. However, if you have a question, you can always contact me through the aforementioned channels. The opinions expressed herein are my own personal opinions and do not represent my employer’s view in any way.'}};return t});
define('viewmodels/error',["plugins/http","knockout","services/logger"],function(){function t(){}return{activate:t}});
define('viewmodels/license',["services/logger"],function(){function e(){}var t={title:"License",description:'Photos, source code and articles published on this website, that are not explicitly mentioned otherwise, are licensed under <a target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US">Creative Commons Attribution-NonCommercial 3.0 Unported</a> license.',terms:[{term:"Attribution"},{term:"Non-Commercial"}],creativeCommons:'<a rel="license" target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="./Content/images/cc_attribution_nocommercial_88x31.png" /></a>',termsOverride:"If any section of this website mentions it's own licensing terms, that will override the terms mentioned here.",commercial:{heading:"Commercial",description:'If you want a higher quality photo published on this website for commercial use, please <a href="#contact">contact me</a>.'},thirdParty:{heading:"Third Party Licenses",description:"This website uses the following awesome libraries:",libraries:[{library:"Durandal JS",license:"MIT",url:"https://raw.github.com/BlueSpire/Durandal/master/License.txt"},{library:"Knockout JS",license:"MIT",url:"https://github.com/knockout/knockout#license"},{library:"Bootstrap",license:"Apache",url:"https://github.com/twbs/bootstrap/blob/master/LICENSE"},{library:"Isotope",license:"MIT / Commercial",url:"http://isotope.metafizzy.co/docs/license.html"},{library:"Require JS",license:'MIT / "New" BSD',url:"https://github.com/jrburke/requirejs/blob/master/LICENSE"},{library:"Lazy Load Plugin for JQuery",license:"MIT",url:"https://github.com/tuupola/jquery_lazyload#license"},{library:"fancyBox",license:"MIT",url:"http://www.fancyapps.com/fancybox/#license"}]},activate:e};return t});
define('viewmodels/photos',["plugins/http","knockout","services/logger","services/photostream","services/common"],function(e,t,i,n,o){function r(){l(),n.load(o.photoUrl,a,s);var e=$("#gallery-container");$("#gallery .filters a").click(function(){var t=$(this).attr("data-filter");return e.isotope({filter:t},function(){"*"==t?$(".fancybox-thumb").attr("data-fancybox-group","gallery"):$(t).find(".fancybox-thumb").attr("data-fancybox-group",t)}),$(this).toggleClass("selected"),$("#gallery .filters a").not(this).removeClass("selected"),!1})}function a(){c(n.stream()),$("#photos-loading").hide(),o.initializeLazyLoad(),o.initializeFancyBox()}function s(){i.logError("Data didn't load as expected. Please try again.",null,!0),$("#photos-loading").hide()}function l(){t.bindingHandlers.isotope={init:function(){},update:function(e,i){var n=$(e),o=t.utils.unwrapObservable(i()),r=$(o.container);r.isotope({itemSelector:o.itemSelector,onLayout:function(){$(window).trigger("scroll")}}),r.isotope("appended",n)}}}var c=t.observableArray([]),u={title:"Ann & Zubin Photography",images:c,compositionComplete:r};return u});
define('plugins/history',["durandal/system","jquery"],function(e,t){function i(e,t,i){if(i){var n=e.href.replace(/(javascript:|#).*$/,"");s.history.replaceState?s.history.replaceState({},document.title,n+"#"+t):e.replace(n+"#"+t)}else e.hash="#"+t}var n=/^[#\/]|\s+$/g,o=/^\/+|\/+$/g,a=/msie [\w.]+/,r=/\/$/,s={interval:50,active:!1};return"undefined"!=typeof window&&(s.location=window.location,s.history=window.history),s.getHash=function(e){var t=(e||s).location.href.match(/#(.*)$/);return t?t[1]:""},s.getFragment=function(e,t){if(null==e)if(s._hasPushState||!s._wantsHashChange||t){e=s.location.pathname+s.location.search;var i=s.root.replace(r,"");e.indexOf(i)||(e=e.substr(i.length))}else e=s.getHash();return e.replace(n,"")},s.activate=function(i){s.active&&e.error("History has already been activated."),s.active=!0,s.options=e.extend({},{root:"/"},s.options,i),s.root=s.options.root,s._wantsHashChange=s.options.hashChange!==!1,s._wantsPushState=!!s.options.pushState,s._hasPushState=!!(s.options.pushState&&s.history&&s.history.pushState);var r=s.getFragment(),c=document.documentMode,l=a.exec(navigator.userAgent.toLowerCase())&&(!c||7>=c);s.root=("/"+s.root+"/").replace(o,"/"),l&&s._wantsHashChange&&(s.iframe=t('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow,s.navigate(r,!1)),s._hasPushState?t(window).on("popstate",s.checkUrl):s._wantsHashChange&&"onhashchange"in window&&!l?t(window).on("hashchange",s.checkUrl):s._wantsHashChange&&(s._checkUrlInterval=setInterval(s.checkUrl,s.interval)),s.fragment=r;var u=s.location,d=u.pathname.replace(/[^\/]$/,"$&/")===s.root;if(s._wantsHashChange&&s._wantsPushState){if(!s._hasPushState&&!d)return s.fragment=s.getFragment(null,!0),s.location.replace(s.root+s.location.search+"#"+s.fragment),!0;s._hasPushState&&d&&u.hash&&(this.fragment=s.getHash().replace(n,""),this.history.replaceState({},document.title,s.root+s.fragment+u.search))}return s.options.silent?void 0:s.loadUrl(i.startRoute)},s.deactivate=function(){t(window).off("popstate",s.checkUrl).off("hashchange",s.checkUrl),clearInterval(s._checkUrlInterval),s.active=!1},s.checkUrl=function(){var e=s.getFragment();return e===s.fragment&&s.iframe&&(e=s.getFragment(s.getHash(s.iframe))),e===s.fragment?!1:(s.iframe&&s.navigate(e,!1),s.loadUrl(),void 0)},s.loadUrl=function(e){var t=s.fragment=s.getFragment(e);return s.options.routeHandler?s.options.routeHandler(t):!1},s.navigate=function(t,n){if(!s.active)return!1;if(void 0===n?n={trigger:!0}:e.isBoolean(n)&&(n={trigger:n}),t=s.getFragment(t||""),s.fragment!==t){s.fragment=t;var o=s.root+t;if(""===t&&"/"!==o&&(o=o.slice(0,-1)),s._hasPushState)s.history[n.replace?"replaceState":"pushState"]({},document.title,o);else{if(!s._wantsHashChange)return s.location.assign(o);i(s.location,t,n.replace),s.iframe&&t!==s.getFragment(s.getHash(s.iframe))&&(n.replace||s.iframe.document.open().close(),i(s.iframe.location,t,n.replace))}return n.trigger?s.loadUrl(t):void 0}},s.navigateBack=function(){s.history.back()},s});
define('plugins/router',["durandal/system","durandal/app","durandal/activator","durandal/events","durandal/composition","plugins/history","knockout","jquery"],function(e,t,n,i,r,o,a,s){function c(e){return e=e.replace(b,"\\$&").replace(h,"(?:$1)?").replace(p,function(e,t){return t?e:"([^/]+)"}).replace(m,"(.*?)"),new RegExp("^"+e+"$",w?void 0:"i")}function l(e){var t=e.indexOf(":"),n=t>0?t-1:e.length;return e.substring(0,n)}function u(e,t){return-1!==e.indexOf(t,e.length-t.length)}function d(e,t){if(!e||!t)return!1;if(e.length!=t.length)return!1;for(var n=0,i=e.length;i>n;n++)if(e[n]!=t[n])return!1;return!0}function f(e){return e.queryString?e.fragment+"?"+e.queryString:e.fragment}var g,v,h=/\((.*?)\)/g,p=/(\(\?)?:\w+/g,m=/\*\w+/g,b=/[\-{}\[\]+?.,\\\^$|#\s]/g,y=/\/$/,w=!1,x="/",k="/",S=function(){function r(e,t){return e.router&&e.router.parent==t}function s(e){T&&T.config.isActive&&T.config.isActive(e)}function h(t,n,i){e.log("Navigation Complete",t,n);var o=e.getModuleId(B);o&&V.trigger("router:navigation:from:"+o),B=t,s(!1),T=n,s(!0);var a=e.getModuleId(B);switch(a&&V.trigger("router:navigation:to:"+a),r(t,V)||V.updateDocumentTitle(t,n),i){case"rootRouter":x=f(T);break;case"rootRouterWithChild":k=f(T);break;case"lastChildRouter":x=k}v.explicitNavigation=!1,v.navigatingBack=!1,V.trigger("router:navigation:complete",t,n,V)}function m(t,n){e.log("Navigation Cancelled"),V.activeInstruction(T),V.navigate(x,!1),$(!1),v.explicitNavigation=!1,v.navigatingBack=!1,V.trigger("router:navigation:cancelled",t,n,V)}function b(t){e.log("Navigation Redirecting"),$(!1),v.explicitNavigation=!1,v.navigatingBack=!1,V.navigate(t,{trigger:!0,replace:!0})}function w(t,n,i){v.navigatingBack=!v.explicitNavigation&&B!=i.fragment,V.trigger("router:route:activating",n,i,V);var o={canDeactivate:!V.parent};t.activateItem(n,i.params,o).then(function(e){if(e){var o=B,a=r(n,V),s="";if(V.parent?a||(s="lastChildRouter"):s=a?"rootRouterWithChild":"rootRouter",h(n,i,s),a){n.router.trigger("router:route:before-child-routes",n,i,V);var c=i.fragment;i.queryString&&(c+="?"+i.queryString),n.router.loadUrl(c)}o==n&&(V.attached(),V.compositionComplete())}else t.settings.lifecycleData&&t.settings.lifecycleData.redirect?b(t.settings.lifecycleData.redirect):m(n,i);g&&(g.resolve(),g=null)}).fail(function(t){e.error(t)})}function C(t,n,i){var r=V.guardRoute(n,i);r||""===r?r.then?r.then(function(r){r?e.isString(r)?b(r):w(t,n,i):m(n,i)}):e.isString(r)?b(r):w(t,n,i):m(n,i)}function I(e,t,n){V.guardRoute?C(e,t,n):w(e,t,n)}function _(e){return T&&T.config.moduleId==e.config.moduleId&&B&&(B.canReuseForRoute&&B.canReuseForRoute.apply(B,e.params)||!B.canReuseForRoute&&B.router&&B.router.loadUrl)}function A(){if(!$()){var t=E.shift();if(E=[],t)if($(!0),V.activeInstruction(t),V.trigger("router:navigation:processing",t,V),_(t)){var i=n.create();i.forceActiveItem(B),i.settings.areSameItem=N.settings.areSameItem,i.settings.findChildActivator=N.settings.findChildActivator,I(i,B,t)}else t.config.moduleId?e.acquire(t.config.moduleId).then(function(n){var i=e.resolveObject(n);t.config.viewUrl&&(i.viewUrl=t.config.viewUrl),I(N,i,t)}).fail(function(n){e.error("Failed to load routed module ("+t.config.moduleId+"). Details: "+n.message,n)}):I(N,{viewUrl:t.config.viewUrl,canReuseForRoute:function(){return!0}},t)}}function D(e){E.unshift(e),A()}function R(e,t,n){for(var i=e.exec(t).slice(1),r=0;r<i.length;r++){var o=i[r];i[r]=o?decodeURIComponent(o):null}var a=V.parseQueryString(n);return a&&i.push(a),{params:i,queryParams:a}}function P(t){V.trigger("router:route:before-config",t,V),e.isRegExp(t.route)?t.routePattern=t.route:(t.title=t.title||V.convertRouteToTitle(t.route),t.viewUrl||(t.moduleId=t.moduleId||V.convertRouteToModuleId(t.route)),t.hash=t.hash||V.convertRouteToHash(t.route),t.hasChildRoutes&&(t.route=t.route+"*childRoutes"),t.routePattern=c(t.route)),t.isActive=t.isActive||a.observable(!1),V.trigger("router:route:after-config",t,V),V.routes.push(t),V.route(t.routePattern,function(e,n){var i=R(t.routePattern,e,n);D({fragment:e,queryString:n,config:t,params:i.params,queryParams:i.queryParams})})}function O(t){if(e.isArray(t.route))for(var n=t.isActive||a.observable(!1),i=0,r=t.route.length;r>i;i++){var o=e.extend({},t);o.route=t.route[i],o.isActive=n,i>0&&delete o.nav,P(o)}else P(t);return V}function j(e){var n=a.unwrap(t.title);document.title=n?e+" | "+n:e}var B,T,E=[],$=a.observable(!1),N=n.create(),V={handlers:[],routes:[],navigationModel:a.observableArray([]),activeItem:N,isNavigating:a.computed(function(){var e=N(),t=$(),n=e&&e.router&&e.router!=V&&e.router.isNavigating()?!0:!1;return t||n}),activeInstruction:a.observable(null),__router__:!0};i.includeIn(V),N.settings.areSameItem=function(e,t,n,i){return e==t?d(n,i):!1},N.settings.findChildActivator=function(e){return e&&e.router&&e.router.parent==V?e.router.activeItem:null},V.parseQueryString=function(t){var n,i;if(!t)return null;if(i=t.split("&"),0==i.length)return null;n={};for(var r=0;r<i.length;r++){var o=i[r];if(""!==o){var a=o.split(/=(.+)?/),s=a[0],c=a[1]&&decodeURIComponent(a[1].replace(/\+/g," ")),l=n[s];l?e.isArray(l)?l.push(c):n[s]=[l,c]:n[s]=c}}return n},V.route=function(e,t){V.handlers.push({routePattern:e,callback:t})},V.loadUrl=function(t){var n=V.handlers,i=null,r=t,a=t.indexOf("?");if(-1!=a&&(r=t.substring(0,a),i=t.substr(a+1)),V.relativeToParentRouter){var s=this.parent.activeInstruction();r=-1==a?s.params.join("/"):s.params.slice(0,-1).join("/"),r&&"/"==r.charAt(0)&&(r=r.substr(1)),r||(r=""),r=r.replace("//","/").replace("//","/")}r=r.replace(y,"");for(var c=0;c<n.length;c++){var l=n[c];if(l.routePattern.test(r))return l.callback(r,i),!0}return e.log("Route Not Found",t,T),V.trigger("router:route:not-found",t,V),V.parent&&(x=k),o.navigate(x,{trigger:!1,replace:!0}),v.explicitNavigation=!1,v.navigatingBack=!1,!1};var M;return a.isObservable(t.title)&&t.title.subscribe(function(){var e=V.activeInstruction(),t=null!=e?a.unwrap(e.config.title):"";j(t)}),V.updateDocumentTitle=function(e,n){var i=a.unwrap(t.title),r=n.config.title;M&&M.dispose(),r?a.isObservable(r)?(M=r.subscribe(j),j(r())):j(r):i&&(document.title=i)},V.navigate=function(t,n){return t&&-1!=t.indexOf("://")?(window.location.href=t,!0):((void 0===n||e.isBoolean(n)&&n||e.isObject(n)&&n.trigger)&&(v.explicitNavigation=!0),(e.isBoolean(n)&&!n||n&&void 0!=n.trigger&&!n.trigger)&&(x=t),o.navigate(t,n))},V.navigateBack=function(){o.navigateBack()},V.attached=function(){V.trigger("router:navigation:attached",B,T,V)},V.compositionComplete=function(){$(!1),V.trigger("router:navigation:composition-complete",B,T,V),A()},V.convertRouteToHash=function(e){if(e=e.replace(/\*.*$/,""),V.relativeToParentRouter){var t=V.parent.activeInstruction(),n=e?t.config.hash+"/"+e:t.config.hash;return o._hasPushState&&(n="/"+n),n=n.replace("//","/").replace("//","/")}return o._hasPushState?e:"#"+e},V.convertRouteToModuleId=function(e){return l(e)},V.convertRouteToTitle=function(e){var t=l(e);return t.substring(0,1).toUpperCase()+t.substring(1)},V.map=function(t,n){if(e.isArray(t)){for(var i=0;i<t.length;i++)V.map(t[i]);return V}return e.isString(t)||e.isRegExp(t)?(n?e.isString(n)&&(n={moduleId:n}):n={},n.route=t):n=t,O(n)},V.buildNavigationModel=function(t){for(var n=[],i=V.routes,r=t||100,o=0;o<i.length;o++){var a=i[o];a.nav&&(e.isNumber(a.nav)||(a.nav=++r),n.push(a))}return n.sort(function(e,t){return e.nav-t.nav}),V.navigationModel(n),V},V.mapUnknownRoutes=function(t,n){var i="*catchall",r=c(i);return V.route(r,function(a,s){var c=R(r,a,s),l={fragment:a,queryString:s,config:{route:i,routePattern:r},params:c.params,queryParams:c.queryParams};if(t)if(e.isString(t))l.config.moduleId=t,n&&o.navigate(n,{trigger:!1,replace:!0});else if(e.isFunction(t)){var u=t(l);if(u&&u.then)return u.then(function(){V.trigger("router:route:before-config",l.config,V),V.trigger("router:route:after-config",l.config,V),D(l)}),void 0}else l.config=t,l.config.route=i,l.config.routePattern=r;else l.config.moduleId=a;V.trigger("router:route:before-config",l.config,V),V.trigger("router:route:after-config",l.config,V),D(l)}),V},V.reset=function(){return T=B=void 0,V.handlers=[],V.routes=[],V.off(),delete V.options,V},V.makeRelative=function(t){return e.isString(t)&&(t={moduleId:t,route:t}),t.moduleId&&!u(t.moduleId,"/")&&(t.moduleId+="/"),t.route&&!u(t.route,"/")&&(t.route+="/"),t.fromParent&&(V.relativeToParentRouter=!0),V.on("router:route:before-config").then(function(e){t.moduleId&&(e.moduleId=t.moduleId+e.moduleId),t.route&&(e.route=""===e.route?t.route.substring(0,t.route.length-1):t.route+e.route)}),t.dynamicHash&&(V.on("router:route:after-config").then(function(e){e.routePattern=c(e.route?t.dynamicHash+"/"+e.route:t.dynamicHash),e.dynamicHash=e.dynamicHash||a.observable(e.hash)}),V.on("router:route:before-child-routes").then(function(e,t){for(var n=e.router,i=0;i<n.routes.length;i++){var r=n.routes[i],o=t.params.slice(0);r.hash=n.convertRouteToHash(r.route).replace(p,function(e){return o.length>0?o.shift():e}),r.dynamicHash(r.hash)}})),V},V.createChildRouter=function(){var e=S();return e.parent=V,e},V};return v=S(),v.explicitNavigation=!1,v.navigatingBack=!1,v.makeRoutesCaseSensitive=function(){w=!0},v.targetIsThisWindow=function(e){var t=s(e.target).attr("target");return!t||t===window.name||"_self"===t||"top"===t&&window===window.top?!0:!1},v.activate=function(t){return e.defer(function(n){if(g=n,v.options=e.extend({routeHandler:v.loadUrl},v.options,t),o.activate(v.options),o._hasPushState)for(var i=v.routes,r=i.length;r--;){var a=i[r];a.hash=a.hash.replace("#","/")}var c=v.options.root&&new RegExp("^"+v.options.root+"/");s(document).delegate("a","click",function(e){if(o._hasPushState){if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&v.targetIsThisWindow(e)){var t=s(this).attr("href");null==t||"#"===t.charAt(0)||/^[a-z]+:/i.test(t)||(v.explicitNavigation=!0,e.preventDefault(),c&&(t=t.replace(c,"")),o.navigate(t))}}else v.explicitNavigation=!0}),o.options.silent&&g&&(g.resolve(),g=null)}).promise()},v.deactivate=function(){o.deactivate()},v.install=function(){a.bindingHandlers.router={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,i,o){var s=a.utils.unwrapObservable(t())||{};if(s.__router__)s={model:s.activeItem(),attached:s.attached,compositionComplete:s.compositionComplete,activate:!1};else{var c=a.utils.unwrapObservable(s.router||i.router)||v;s.model=c.activeItem(),s.attached=c.attached,s.compositionComplete=c.compositionComplete,s.activate=!1}r.compose(e,s,o)}},a.virtualElements.allowedBindings.router=!0},v});
define('viewmodels/shell',["durandal/system","plugins/router","services/logger"],function(e,t,o){function i(){return o.log("Welcome!",null,!0),t.on("router:navigation:complete",function(){window._gaq.push(["_trackPageview",location.pathname+location.search+location.hash])}),t.on("router:route:not-found",function(){t.navigate("#error/404")}),t.map([{route:"",title:"Welcome",icon:"glyphicon-home",moduleId:"viewmodels/welcome",nav:!0},{route:"blog",title:"Blog",icon:"glyphicon-book",moduleId:"viewmodels/blog",nav:!0},{route:"photos",title:"Photography",icon:"glyphicon-camera",moduleId:"viewmodels/photos",nav:!0},{route:"contact",title:"Contact",icon:"glyphicon-envelope",moduleId:"viewmodels/contact",nav:!0},{route:"license",title:"License",icon:"",moduleId:"viewmodels/license",nav:!1},{route:"error",title:"Error",icon:"",moduleId:"viewmodels/error",nav:!1},{route:"error/:id",title:"Error",icon:"",moduleId:"viewmodels/error",nav:!1}]).buildNavigationModel(),t.activate()}function n(){$(".nav li a").on("click",function(){$(".navbar-collapse").collapse("hide")})}var r={router:t,footer:{copyright:"Copyright © 2010-"+(new Date).getFullYear()+' <a href="http://www.zubinraj.com/">Zubin Raj</a>',lines:[{line:'Follow me on <a href="https://github.com/zubinraj/" target="_blank">GitHub</a> | <a href="https://twitter.com/zubinraj" target="_blank">Twitter</a>'},{line:'Powered by <a href="http://weblogs.asp.net/scottgu/archive/2010/07/02/introducing-razor.aspx">Razor.Net</a>, <a href="http://durandaljs.com/" target="_blank">Durandal JS</a>, <a href="http://knockoutjs.com/" target="_blank">Knockout JS</a>, <a href="http://getbootstrap.com/" target="_blank">Bootstrap</a> and <a href="http://isotope.metafizzy.co/" target="_blank">Isotope</a>'}],creativeCommons:'<a rel="license" target="_blank" href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="/Content/images/cc_attribution_nocommercial_88x31.png" /></a>'},activate:i,compositionComplete:n};return r});
define('viewmodels/welcome',["plugins/http","durandal/app","knockout","services/logger","services/photostream","services/blogstream","services/common"],function(e,t,o,i,n,r,a){function l(){}function s(){r.load(a.blogUrl,c,d),n.load(a.photoUrl,u,h)}function c(){p(r.partialStream()),$("#welcome-blog-loading").hide()}function u(){m(n.partialStream()),$("#welcome-photos-loading").hide(),a.initializeLazyLoad()}function d(){i.logError("Data didn't load as expected. Please try again.",null,!0),$("#welcome-blog-loading").hide()}function h(){i.logError("Data didn't load as expected. Please try again.",null,!0),$("#welcome-photos-loading").hide()}var p=o.observableArray([]),m=o.observableArray([]),g={title:"Welcome!",developerWidget:{title:"Web Developer",description:"A programmer, primarily developing web applications at work and for fun. I love working on the latest and the greatest frameworks and technologies. Here ae some that have grabbed my fancy recently.",thumbUrl:"./Content/images/oneszeroes.jpg",technologies:[{item:"ASP.Net MVC"},{item:"Durandal JS"},{item:"Knockout JS"},{item:"Single Page Applications"},{item:"PHP"},{item:"Wordpress Plugins"}]},photographerWidget:{title:"Photographer",description:'A hobbyist photographer, I enjoy taking pictures of birds in their natural surroundings. I\'m joined by my wife Ann Zubin, who is a photography enthusiast herself. Take a look at <a href="#photos">Zubin & Ann Photography</a> and let us know what you think.'},recentPhotosWidget:{title:"Recent Photos",images:m,footer:'<a href="#photos">more</a>..'},recentPostsWidget:{title:"Recent Posts",items:p,footer:'<a href="#blog">more</a>..'},profileWidget:{title:"Profile",items:[{item:'Solution Architect at <a target="_blank" href="http://www.wipro.com">Wipro</a>'},{item:"Programmer by profession"},{item:"Love reading books"},{item:"Enjoy outdoor activites"},{item:"Bird photography enthusiast"}]},activate:l,compositionComplete:s};return g});
define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
define('text!views/blog.html',[],function () { return '<section id="blog">\n    <!--<h2 data-bind="text: title"></h2>-->\n    <div class="options">\n        <ul class="filters list-inline">\n            <li class="first"><a class="selected" data-filter="*" href="javascript: void(0);">Show All</a></li>\n            <li><a href="javascript: void(0);" data-filter=".programming">Programming</a></li>\n            <li><a href="javascript: void(0);" data-filter=".mobile">Mobile</a></li>\n            <li><a href="javascript: void(0);" data-filter=".linux">Linux</a></li>\n            <li><a href="javascript: void(0);" data-filter=".winrt">Win RT</a></li>\n            <li><a href="javascript: void(0);" data-filter=".wordpress">Wordpress</a></li>\n            <li><a href="javascript: void(0);" data-filter=".editorial">Editorial</a></li>\n        </ul>\n    </div>\n\n    <span id="blog-loading" class="loading"></span>\n\n    <div id="blog-container" data-bind="foreach: items">\n        <div class="blog-item" data-bind="css: categories, isotope: { container: \'#blog-container\', itemSelector: \'.blog-item\' }">\n            <a data-bind="attr: { href: link }">\n                <h3 data-bind="html: title"></h3>\n            </a>\n            <p data-bind="html: description"></p>\n            <small><a data-bind="attr: { href: link }">Read More</a></small>\n                \n        </div>\n    </div>\n\n</section>';});

define('text!views/contact.html',[],function () { return '<section>\n    <h2 data-bind="text: title"></h2>\n    <table class="table table-striped table-hover" data-bind="foreach: channels">\n        <tr>\n            <td data-bind="text: channel"></td>\n            <td><a data-bind="enable: url.length > 0, attr: { href: url }, text: text"></a></td>\n        </tr>\n    </table>\n\n    <div data-bind="with: license">\n        <h2 data-bind="text: heading"></h2>\n        <p data-bind="html: description"></p>\n    </div>\n    \n    <div data-bind="with: disclaimer">\n        <h2 data-bind="text: heading"></h2>\n        <p data-bind="html: description"></p>\n    </div>    \n</section>';});

define('text!views/error.html',[],function () { return '<section>\n    <h2>Page Not Found</h2>\n    <p>You may have followed a link which is outdated or incorrect. Or we may have screwed up, these things happen.</p>\n\n    <h4>A few things you can try</h4>\n    <ul>\n        <li>Use your browser\'s back button to go the previous page you were viewing</li>\n        <li>If you accessed this page using a bookmark/favorite, please update the bookmark with the correct link</li>\n        <li>Go to the <a href="#">home page</a></li>\n        <li>Need help or if you have a question, please <a href="#contact">contact me</a></li>\n    </ul>\n</section>\n';});

define('text!views/flickr.html',[],function () { return '<section>\r\n    <div class="row">\r\n        <ul class="list-inline" data-bind="foreach: images">\r\n            <li>\r\n                <a href="#" class="thumbnail" data-bind="click: $parent.select">\r\n                    <img style="width: 260px; height: 180px;" data-bind="attr: { src: media.m }"/>\r\n                    <span data-bind="text: title"></span>\r\n                    <span data-bind="text: tags"></span>\r\n                </a>\r\n            </li>\r\n        </ul>\r\n    </div>\r\n</section>';});

define('text!views/footer.html',[],function () { return '    <div class="bs-footer" data-bind="with: footer">\n        <small class="text-muted">\n            <p data-bind="html: copyright"></p>\n            <span data-bind="foreach: lines">\n                <p data-bind="html: line"></p>\n            </span>\n        </small>\n        <div class="clearfix"> <p data-bind="html: creativeCommons"></p></div>\n    </div>\n';});

define('text!views/header.html',[],function () { return '    <nav class="navbar navbar-fixed-top navbar-default" role="navigation">\r\n        <div class="navbar-header">\r\n            <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-ex1-collapse">\r\n              <span class="sr-only">Toggle navigation</span>\r\n              <span class="icon-bar"></span>\r\n              <span class="icon-bar"></span>\r\n              <span class="icon-bar"></span>\r\n            </button>\r\n\r\n            <a class="navbar-brand" data-bind="attr: { href: router.navigationModel()[0].hash }">\r\n                <!--<i class="glyphicon glyphicon-leaf"></i>-->\r\n                <span>ZUBINRAJ.COM</span>\r\n            </a>\r\n        </div>\r\n        <div class="collapse navbar-collapse navbar-ex1-collapse">\r\n            <ul class="nav navbar-nav" data-bind="foreach: router.navigationModel">\r\n                <li data-bind="css: { active: isActive }">\r\n                    <a data-bind="attr: { href: hash }">\r\n                        <i class="glyphicon" data-bind="css: icon"></i>\r\n                        <span data-bind="text: title"></span>\r\n                    </a>\r\n                </li>\r\n            </ul>\r\n        \r\n            <div class="loader pull-right" data-bind="css: { active: router.isNavigating }">\r\n                <i class="icon-spinner icon-2x icon-spin"></i>\r\n            </div>\r\n        </div>        \r\n    </nav>\r\n';});

define('text!views/license.html',[],function () { return '<section>\n    <h2 data-bind="text: title"></h2>\n    <p data-bind="html: description"></p>\n    <div class="pull-left" style="width: 200px;">\n        <ul data-bind="foreach: terms">\n            <li data-bind="text: term"></li>\n        </ul>\n    </div>\n\n    <div class="clearfix"> <p data-bind="html: creativeCommons"></p></div>\n\n    <p data-bind="text: termsOverride"></p>\n\n<!--    <div data-bind="with: commercial">\n        <h2 data-bind="text: heading"></h2>\n        <p data-bind="html: description"></p>\n    </div>-->\n\n    <div data-bind="with: thirdParty">\n        <h2 data-bind="text: heading"></h2>\n        <p data-bind="html: description"></p>\n        <table class="table table-striped table-hover" data-bind="foreach: libraries">\n            <tr> \n                <td data-bind="text: library"></td>\n                <td data-bind="text: license"></td>\n                <td><a data-bind="attr: { href: url }, text: url" target="_blank"></a></td>\n            </tr>\n        </table>\n    </div>\n</section>';});

define('text!views/photos.html',[],function () { return '<section id="gallery">\n    <!--<h2 data-bind="text: title"></h2>-->\n    <div class="options">\n        <ul class="filters list-inline">\n            <li class="first"><a class="selected" data-filter="*" href="javascript: void(0);">Show All</a></li>\n            <li><a href="javascript: void(0);" data-filter=".people">People</a></li>\n            <li><a href="javascript: void(0);" data-filter=".places">Places</a></li>\n            <li><a href="javascript: void(0);" data-filter=".bird">Birds</a></li>\n            <li><a href="javascript: void(0);" data-filter=".portfolio">Portfolio</a></li>\n        </ul>\n    </div>\n\n    <span id="photos-loading" class="loading"></span>\n\n    <div id="gallery-container"  class="list-inline" data-bind="foreach: images">\n        <div class="gallery-item" data-bind="css: categories, style: { height: thumbHeight, width: thumbWidth }, isotope: { container: \'#gallery-container\', itemSelector: \'.gallery-item\' }">\n            <a class="fancybox-thumb" data-fancybox-group="gallery" data-bind="attr: { href: originalUrl }">\n                <img class="lazy" src="/Content/images/grey.gif" data-bind="attr: { \'data-original\': thumbUrl, title: title, alt: title, height: thumbHeight, width: thumbWidth }"/>\n                <!--<span data-bind="text: title"></span>-->\n            </a>\n        </div>\n    </div>\n</section>';});

define('text!views/shell.html',[],function () { return '<div>\n    <header data-bind="compose: { view: \'header\' }"></header>\n    \n    <div class="container page-host" data-bind="router: { transition:\'entrance\', cacheViews:true }"></div>\n\n    <footer data-bind="compose: { view: \'footer\' }"></footer>\n\n</div>';});

define('text!views/welcome.html',[],function () { return '    <section id="welcome">\n    <div class="jumbotron">\n        <div class="container">\n            <h2 data-bind="html: title"></h2>\n            <p></p>\n        </div>\n    </div>\n    <div class="col-sm-4">\n        <div class="widget" data-bind="with: developerWidget">\n            <h3 data-bind="text: title"></h3>\n            <p data-bind="html: description"></p>\n            <ul class="list-unstyled" data-bind="foreach: technologies">\n                <li><i class="glyphicon glyphicon-ok" style="color:green"></i>&nbsp;<span data-bind="text: item"></span></li>\n            </ul>\n        </div>\n        <div class="widget" data-bind="with: profileWidget">\n            <h3 data-bind="text: title"></h3>\n            <ul class="list-unstyled" data-bind="foreach: items">\n                <li><i class="glyphicon glyphicon-ok" style="color:green"></i>&nbsp;<span data-bind="html: item"></span></li>\n            </ul>\n        </div>\n    </div>\n    <div class="col-sm-4">\n        <div class="widget" data-bind="with: recentPostsWidget">\n            <h3 data-bind="text: title"></h3>\n            <span id="welcome-blog-loading" class="loading"></span>\n            <ul class="list-unstyled" data-bind="foreach: items">\n                <li class="list-items"><a data-bind="attr: { href: link }, text: title"></a></li>\n            </ul>\n            <div data-bind="html: footer"></div>\n        </div>\n    </div>\n    <div class="col-sm-4">\n        <div class="widget" data-bind="with: photographerWidget">\n            <h3 data-bind="text: title"></h3>\n            <p data-bind="html: description"></p>\n        </div>\n        <div class="widget" data-bind="with: recentPhotosWidget">\n            <h3 data-bind="text: title"></h3>\n            <span id="welcome-photos-loading" class="loading"></span>\n            <div data-bind="foreach: images">\n                <div><a><img class="img img-thumbnail lazy" src="/Content/images/grey.gif" data-bind="attr: { \'data-original\': thumbUrl, alt: title, height: thumbHeight, width: thumbWidth }" /></a></div>\n            </div>\n            <div data-bind="html: footer"></div>\n        </div>\n    </div>\n\n</section>';});

define('plugins/dialog',["durandal/system","durandal/app","durandal/composition","durandal/activator","durandal/viewEngine","jquery","knockout"],function(e,t,i,n,o,a,r){function s(t){return e.defer(function(i){e.isString(t)?e.acquire(t).then(function(t){i.resolve(e.resolveObject(t))}).fail(function(i){e.error("Failed to load dialog module ("+t+"). Details: "+i.message)}):i.resolve(t)}).promise()}var l,c={},u=r.observable(0),d=function(e,t,i,n,o){this.message=e,this.title=t||d.defaultTitle,this.options=i||d.defaultOptions,this.autoclose=n||!1,this.settings=a.extend({},d.defaultSettings,o)};return d.prototype.selectOption=function(e){l.close(this,e)},d.prototype.getView=function(){return o.processMarkup(d.defaultViewMarkup)},d.setViewUrl=function(e){delete d.prototype.getView,d.prototype.viewUrl=e},d.defaultTitle=t.title||"Application",d.defaultOptions=["Ok"],d.defaultSettings={buttonClass:"btn btn-default",primaryButtonClass:"btn-primary autofocus",secondaryButtonClass:"","class":"modal-content messageBox",style:null},d.setDefaults=function(e){a.extend(d.defaultSettings,e)},d.prototype.getButtonClass=function(e){var t="";return this.settings&&(this.settings.buttonClass&&(t=this.settings.buttonClass),0===e()&&this.settings.primaryButtonClass&&(t.length>0&&(t+=" "),t+=this.settings.primaryButtonClass),e()>0&&this.settings.secondaryButtonClass&&(t.length>0&&(t+=" "),t+=this.settings.secondaryButtonClass)),t},d.prototype.getClass=function(){return this.settings?this.settings["class"]:"messageBox"},d.prototype.getStyle=function(){return this.settings?this.settings.style:null},d.prototype.getButtonText=function(t){var i=a.type(t);return"string"===i?t:"object"===i?"string"===a.type(t.text)?t.text:(e.error("The object for a MessageBox button does not have a text property that is a string."),null):(e.error("Object for a MessageBox button is not a string or object but "+i+"."),null)},d.prototype.getButtonValue=function(t){var i=a.type(t);return"string"===i?t:"object"===i?"undefined"===a.type(t.text)?(e.error("The object for a MessageBox button does not have a value property defined."),null):t.value:(e.error("Object for a MessageBox button is not a string or object but "+i+"."),null)},d.defaultViewMarkup=['<div data-view="plugins/messageBox" data-bind="css: getClass(), style: getStyle()">','<div class="modal-header">','<h3 data-bind="html: title"></h3>',"</div>",'<div class="modal-body">','<p class="message" data-bind="html: message"></p>',"</div>",'<div class="modal-footer">',"<!-- ko foreach: options -->",'<button data-bind="click: function () { $parent.selectOption($parent.getButtonValue($data)); }, text: $parent.getButtonText($data), css: $parent.getButtonClass($index)"></button>',"<!-- /ko -->",'<div style="clear:both;"></div>',"</div>","</div>"].join("\n"),l={MessageBox:d,currentZIndex:1050,getNextZIndex:function(){return++this.currentZIndex},isOpen:r.computed(function(){return u()>0}),getContext:function(e){return c[e||"default"]},addContext:function(e,t){t.name=e,c[e]=t;var i="show"+e.substr(0,1).toUpperCase()+e.substr(1);this[i]=function(t,i){return this.show(t,i,e)}},createCompositionSettings:function(e,t){var i={model:e,activate:!1,transition:!1};return t.binding&&(i.binding=t.binding),t.attached&&(i.attached=t.attached),t.compositionComplete&&(i.compositionComplete=t.compositionComplete),i},getDialog:function(e){return e?e.__dialog__:void 0},close:function(e){var t=this.getDialog(e);if(t){var i=Array.prototype.slice.call(arguments,1);t.close.apply(t,i)}},show:function(t,o,a){var r=this,l=c[a||"default"];return e.defer(function(e){s(t).then(function(t){var a=n.create();a.activateItem(t,o).then(function(n){if(n){var o=t.__dialog__={owner:t,context:l,activator:a,close:function(){var i=arguments;a.deactivateItem(t,!0).then(function(n){n&&(u(u()-1),l.removeHost(o),delete t.__dialog__,0===i.length?e.resolve():1===i.length?e.resolve(i[0]):e.resolve.apply(e,i))})}};o.settings=r.createCompositionSettings(t,l),l.addHost(o),u(u()+1),i.compose(o.host,o.settings)}else e.resolve(!1)})})}).promise()},showMessage:function(t,i,n,o,a){return e.isString(this.MessageBox)?l.show(this.MessageBox,[t,i||d.defaultTitle,n||d.defaultOptions,o||!1,a||{}]):l.show(new this.MessageBox(t,i,n,o,a))},install:function(e){t.showDialog=function(e,t,i){return l.show(e,t,i)},t.closeDialog=function(){return l.close.apply(l,arguments)},t.showMessage=function(e,t,i,n,o){return l.showMessage(e,t,i,n,o)},e.messageBox&&(l.MessageBox=e.messageBox),e.messageBoxView&&(l.MessageBox.prototype.getView=function(){return o.processMarkup(e.messageBoxView)}),e.messageBoxViewUrl&&l.MessageBox.setViewUrl(e.messageBoxViewUrl)}},l.addContext("default",{blockoutOpacity:.2,removeDelay:200,addHost:function(e){var t=a("body"),i=a('<div class="modalBlockout"></div>').css({"z-index":l.getNextZIndex(),opacity:this.blockoutOpacity}).appendTo(t),n=a('<div class="modalHost"></div>').css({"z-index":l.getNextZIndex()}).appendTo(t);if(e.host=n.get(0),e.blockout=i.get(0),!l.isOpen()){e.oldBodyMarginRight=t.css("margin-right"),e.oldInlineMarginRight=t.get(0).style.marginRight;var o=a("html"),r=t.outerWidth(!0),s=o.scrollTop();a("html").css("overflow-y","hidden");var c=a("body").outerWidth(!0);t.css("margin-right",c-r+parseInt(e.oldBodyMarginRight,10)+"px"),o.scrollTop(s)}},removeHost:function(e){if(a(e.host).css("opacity",0),a(e.blockout).css("opacity",0),setTimeout(function(){r.removeNode(e.host),r.removeNode(e.blockout)},this.removeDelay),!l.isOpen()){var t=a("html"),i=t.scrollTop();t.css("overflow-y","").scrollTop(i),e.oldInlineMarginRight?a("body").css("margin-right",e.oldBodyMarginRight):a("body").css("margin-right","")}},attached:function(e){a(e).css("visibility","hidden")},compositionComplete:function(e,t,i){var n=l.getDialog(i.model),o=a(e),r=o.find("img").filter(function(){var e=a(this);return!(this.style.width&&this.style.height||e.attr("width")&&e.attr("height"))});o.data("predefinedWidth",o.get(0).style.width);var s=function(e,t){setTimeout(function(){var i=a(e);t.context.reposition(e),a(t.host).css("opacity",1),i.css("visibility","visible"),i.find(".autofocus").first().focus()},1)};s(e,n),r.load(function(){s(e,n)}),(o.hasClass("autoclose")||i.model.autoclose)&&a(n.blockout).click(function(){n.close()})},reposition:function(e){var t=a(e),i=a(window);t.data("predefinedWidth")||t.css({width:""});var n=t.outerWidth(!1),o=t.outerHeight(!1),r=i.height()-10,s=i.width()-10,l=Math.min(o,r),c=Math.min(n,s);t.css({"margin-top":(-l/2).toString()+"px","margin-left":(-c/2).toString()+"px"}),o>r?t.css("overflow-y","auto").outerHeight(r):t.css({"overflow-y":"",height:""}),n>s?t.css("overflow-x","auto").outerWidth(s):(t.css("overflow-x",""),t.data("predefinedWidth")?t.css("width",t.data("predefinedWidth")):t.outerWidth(c))}}),l});
define('plugins/observable',["durandal/system","durandal/binder","knockout"],function(e,t,n){function i(e){var t=e[0];return"_"===t||"$"===t||S&&e===S}function o(t){return!(!t||void 0===t.nodeType||!e.isNumber(t.nodeType))}function r(e){if(!e||o(e)||e.ko===n||e.jquery)return!1;var t=g.call(e);return-1==p.indexOf(t)&&!(e===!0||e===!1)}function a(e){var t={};return Object.defineProperty(e,"__observable__",{enumerable:!1,configurable:!1,writable:!1,value:t}),t}function s(e,t,n){var i=e.__observable__,o=!0;if(!i||!i.__full__){i=i||a(e),i.__full__=!0,y.forEach(function(n){t[n]=function(){return w[n].apply(e,arguments)}}),v.forEach(function(n){e[n]=function(){o=!1;var e=x[n].apply(t,arguments);return o=!0,e}}),m.forEach(function(n){e[n]=function(){o&&t.valueWillMutate();var i=w[n].apply(e,arguments);return o&&t.valueHasMutated(),i}}),b.forEach(function(i){e[i]=function(){for(var r=0,a=arguments.length;a>r;r++)c(arguments[r],n);o&&t.valueWillMutate();var s=w[i].apply(e,arguments);return o&&t.valueHasMutated(),s}}),e.splice=function(){for(var i=2,r=arguments.length;r>i;i++)c(arguments[i],n);o&&t.valueWillMutate();var a=w.splice.apply(e,arguments);return o&&t.valueHasMutated(),a};for(var r=0,s=e.length;s>r;r++)c(e[r],n)}}function c(t,i){var o,c;if(S&&t&&t[S]&&(i=i?i.slice(0):[],i.push(t[S])),r(t)&&(o=t.__observable__,!o||!o.__full__)){if(o=o||a(t),o.__full__=!0,e.isArray(t)){var l=n.observableArray(t);s(t,l,i)}else for(var f in t)if(!h(f)&&!o[f]){var g=Object.getPropertyDescriptor(t,f);g&&(g.get||g.set)?d(t,f,{get:g.get,set:g.set}):(c=t[f],e.isFunction(c)||u(t,f,c,i))}k&&e.log("Converted",t)}}function l(e,t,n){n?t?t.destroyAll||s(t,e):(t=[],s(t,e)):c(t),e(t)}function u(t,i,o,r){var u,d,f=t.__observable__||a(t);if(void 0===o&&(o=t[i]),e.isArray(o))u=n.observableArray(o),s(o,u,r),d=!0;else if("function"==typeof o){if(!n.isObservable(o))return null;u=o}else!_&&e.isPromise(o)?(u=n.observable(),o.then(function(t){if(e.isArray(t)){var i=n.observableArray(t);s(t,i,r),t=i}u(t)})):(u=n.observable(o),c(o,r));return r&&r.length>0&&r.forEach(function(n){e.isArray(o)?u.subscribe(function(e){n(t,i,null,e)},null,"arrayChange"):u.subscribe(function(e){n(t,i,e,null)})}),Object.defineProperty(t,i,{configurable:!0,enumerable:!0,get:u,set:n.isWriteableObservable(u)?function(t){t&&e.isPromise(t)&&!_?t.then(function(t){l(u,t,e.isArray(t))}):l(u,t,d)}:void 0}),f[i]=u,u}function d(t,i,o){var r,a={owner:t,deferEvaluation:!0};return"function"==typeof o?a.read=o:("value"in o&&e.error('For defineProperty, you must not specify a "value" for the property. You must provide a "get" function.'),"function"!=typeof o.get&&"function"!=typeof o.read&&e.error('For defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".'),a.read=o.get||o.read,a.write=o.set||o.write),r=n.computed(a),t[i]=r,u(t,i,r)}var f,h,g=Object.prototype.toString,p=["[object Function]","[object String]","[object Boolean]","[object Number]","[object Date]","[object RegExp]"],v=["remove","removeAll","destroy","destroyAll","replace"],m=["pop","reverse","sort","shift","slice"],b=["push","unshift"],y=["filter","map","reduce","reduceRight","forEach","every","some"],w=Array.prototype,x=n.observableArray.fn,k=!1,S=void 0,_=!1;if(!("getPropertyDescriptor"in Object)){var A=Object.getOwnPropertyDescriptor,C=Object.getPrototypeOf;Object.getPropertyDescriptor=function(e,t){for(var n,i=e;i&&!(n=A(i,t));)i=C(i);return n}}return f=function(e,t){var i,o,r;return e?(i=e.__observable__,i&&(o=i[t])?o:(r=e[t],n.isObservable(r)?r:u(e,t,r))):null},f.defineProperty=d,f.convertProperty=u,f.convertObject=c,f.install=function(e){var n=t.binding;t.binding=function(e,t,i){i.applyBindings&&!i.skipConversion&&c(e),n(e,t)},k=e.logConversion,e.changeDetection&&(S=e.changeDetection),_=e.skipPromises,h=e.shouldIgnorePropertyName||i},f});
define('plugins/serializer',["durandal/system"],function(e){return{typeAttribute:"type",space:void 0,replacer:function(e,t){if(e){var n=e[0];if("_"===n||"$"===n)return void 0}return t},serialize:function(t,n){return n=void 0===n?{}:n,(e.isString(n)||e.isNumber(n))&&(n={space:n}),JSON.stringify(t,n.replacer||this.replacer,n.space||this.space)},getTypeId:function(e){return e?e[this.typeAttribute]:void 0},typeMap:{},registerType:function(){var t=arguments[0];if(1==arguments.length){var n=t[this.typeAttribute]||e.getModuleId(t);this.typeMap[n]=t}else this.typeMap[t]=arguments[1]},reviver:function(e,t,n,i){var r=n(t);if(r){var o=i(r);if(o)return o.fromJSON?o.fromJSON(t):new o(t)}return t},deserialize:function(e,t){var n=this;t=t||{};var i=t.getTypeId||function(e){return n.getTypeId(e)},r=t.getConstructor||function(e){return n.typeMap[e]},o=t.reviver||function(e,t){return n.reviver(e,t,i,r)};return JSON.parse(e,o)},clone:function(e,t){return this.deserialize(this.serialize(e,t),t)}}});
define('plugins/widget',["durandal/system","durandal/composition","jquery","knockout"],function(e,t,n,i){function r(e,n){var r=i.utils.domData.get(e,c);r||(r={parts:t.cloneNodes(i.virtualElements.childNodes(e))},i.virtualElements.emptyNode(e),i.utils.domData.set(e,c,r)),n.parts=r.parts}var o={},a={},s=["model","view","kind"],c="durandal-widget-data",l={getSettings:function(t){var n=i.utils.unwrapObservable(t())||{};if(e.isString(n))return{kind:n};for(var r in n)n[r]=-1!=i.utils.arrayIndexOf(s,r)?i.utils.unwrapObservable(n[r]):n[r];return n},registerKind:function(e){i.bindingHandlers[e]={init:function(){return{controlsDescendantBindings:!0}},update:function(t,n,i,o,a){var s=l.getSettings(n);s.kind=e,r(t,s),l.create(t,s,a,!0)}},i.virtualElements.allowedBindings[e]=!0,t.composeBindings.push(e+":")},mapKind:function(e,t,n){t&&(a[e]=t),n&&(o[e]=n)},mapKindToModuleId:function(e){return o[e]||l.convertKindToModulePath(e)},convertKindToModulePath:function(e){return"widgets/"+e+"/viewmodel"},mapKindToViewId:function(e){return a[e]||l.convertKindToViewPath(e)},convertKindToViewPath:function(e){return"widgets/"+e+"/view"},createCompositionSettings:function(e,t){return t.model||(t.model=this.mapKindToModuleId(t.kind)),t.view||(t.view=this.mapKindToViewId(t.kind)),t.preserveContext=!0,t.activate=!0,t.activationData=t,t.mode="templated",t},create:function(e,n,i,r){r||(n=l.getSettings(function(){return n},e));var o=l.createCompositionSettings(e,n);t.compose(e,o,i)},install:function(e){if(e.bindingName=e.bindingName||"widget",e.kinds)for(var n=e.kinds,o=0;o<n.length;o++)l.registerKind(n[o]);i.bindingHandlers[e.bindingName]={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,i,o){var a=l.getSettings(t);r(e,a),l.create(e,a,o,!0)}},t.composeBindings.push(e.bindingName+":"),i.virtualElements.allowedBindings[e.bindingName]=!0}};return l});
define('transitions/entrance',["durandal/system","durandal/composition","jquery"],function(e,t,n){var i=100,r={marginRight:0,marginLeft:0,opacity:1},o={marginLeft:"",marginRight:"",opacity:"",display:""},a=function(t){return e.defer(function(e){function a(){e.resolve()}function s(){t.keepScrollPosition||n(document).scrollTop(0)}function c(){s(),t.triggerAttach();var e={marginLeft:u?"0":"20px",marginRight:u?"0":"-20px",opacity:0,display:"block"},i=n(t.child);i.css(e),i.animate(r,l,"swing",function(){i.css(o),a()})}if(t.child){var l=t.duration||500,u=!!t.fadeOnly;t.activeView?n(t.activeView).fadeOut(i,c):c()}else n(t.activeView).fadeOut(i,a)}).promise()};return a});
require(["main"]);
}());