'use strict';

function Route(name, htmlName, navElement, defaultRoute) {
    try {
        if(!name || !htmlName) {
            throw 'error: name and htmlName params are mandatories';
        }
        this.constructor(name, htmlName, navElement, defaultRoute);
    } catch (e) {
        console.error(e);
    }
}

Route.prototype = {
    name: undefined,
    htmlName: undefined,
    default: undefined,
    constructor: function (name, htmlName, navElement, defaultRoute) {
        this.name = name;
        this.htmlName = htmlName;
        this.navElement = navElement;
        this.default = defaultRoute;
    },
    isActiveRoute: function (hashedPath) {
        return hashedPath.replace('#', '') === this.name;
    }
}

function Router(routes) {
    try {
        if (!routes) {
            throw 'error: routes param is mandatory';
        }
        this.constructor(routes);
        this.init();
    } catch (e) {
        console.error(e);
    }
}

Router.prototype = {
    routes: undefined,
    rootElem: undefined,
    constructor: function (routes) {
        this.routes = routes;
        this.rootElem = document.getElementById('app');
    },
    init: function () {
        var r = this.routes;
        (function(scope, r) {
            window.addEventListener('hashchange', function (e) {
                scope.hasChanged(scope, r);
            });
        })(this, r);
        this.hasChanged(this, r);
    },
    hasChanged: function(scope, r){
        if (window.location.hash.length > 0) {
            for (var i in r) {
                var route = r[i];
                if(route.isActiveRoute(window.location.hash.substr(1))) {
                    scope.updateActiveNav(route.navElement)
                    scope.goToRoute(route.htmlName);
                }
            }
        } else {
            for (var i in r) {
                var route = r[i];
                if(route.default) {
                    scope.updateActiveNav(route.navElement)
                    scope.goToRoute(route.htmlName);
                }
            }
        }
    },
    goToRoute: function (htmlName) {
        (function(scope) {
            var url = 'views/' + htmlName,
                xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState === 4 && this.status === 200) {
                    scope.rootElem.innerHTML = this.responseText;
                }
            };
            xhttp.open('GET', url, true);
            xhttp.send();
        })(this);
    },
    updateActiveNav: function(navElement) {
        (function(scope) {
            var previousRoute = scope.routes.find(e => e.navElement.classList.contains('active'));
            if (previousRoute) {
                previousRoute.navElement.classList.remove('active');
            }
            navElement.classList.add('active');
        })(this);
    }
};


(function () {
    function init() {
        var router = new Router([
            new Route('home', 'home.html', document.getElementById('nav-home'), true),
            new Route('leads', 'leads.html', document.getElementById('nav-leads')),
            new Route('opportunities', 'opportunities.html', document.getElementById('nav-opportunities')),
            new Route('reports', 'reports.html', document.getElementById('nav-reports'))
        ]);
    }
    init();
}());

